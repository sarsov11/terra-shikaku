/* ═══════════════════════════════════════════════════════════
   {{BRAND}} — データ層（日本語版フレーム）

   画面はこのファイルだけを呼ぶ。data.js はパイプラインの産出物（変換スクリプト）なので手で直さない。
   学習記録はこのブラウザだけに積み上がる — localStorage `tj.<科目キー>.v1` ·
   設定 `tj.pref.v1` · テーマ `tj.skin`（★ 接頭辞は "tj." — 韓国版の jg.・mj. と重ならないように。
   同じ github.io から配る場合、ブラウザの保存領域が混ざってしまう）。

   韓国版（姉妹アプリ群）で固まった設計をそのまま引き継いだ —
     · 学習者に選ばせない。ホームは「今日やること」1 つだけ。
     · 分量は問題数ではなく**時間**で言う（1 日 10・15・20・30 分）。
     · 判定は確信度 × 正誤（judge.js）。確信度は答えより先に聞く。
     · 巻き戻し（間隔復習）が新しい文より先。
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var T = window.TREE, QB = window.QBANK || {}, PR = window.PAIRS || [];
  if (!T) { console.error("data.js が先に読み込まれている必要があります"); return; }

  var KEY = "tj." + (T.key || T.subject) + ".v1", PREF = "tj.pref.v1", SKIN = "tj.skin";

  function read(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var S = read(KEY, null) || {};
  S.ans = S.ans || {}; S.days = S.days || {}; S.pairs = S.pairs || {};
  var P = read(PREF, null) || {};
  function save() { S.at = Date.now(); write(KEY, S); }
  function savePref() { write(PREF, P); }

  /* ── 日付 — 1 日は端末時刻の 0 時起点 ── */
  function ymd(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function dayNo(s) { var d = s ? new Date(s + "T00:00:00") : new Date(); d.setHours(0, 0, 0, 0); return Math.round(d / 86400000); }
  var TODAY = ymd(), TODAYN = dayNo();

  /* ── 索引 ── */
  var NODE = {}, CH = {}, PART = {}, ITEM = {};
  T.nodes.forEach(function (n) {
    NODE[n.no] = n;
    n.chkey = n.part + "-" + (n.ch < 10 ? "0" + n.ch : n.ch);
  });
  T.chs.forEach(function (c) { CH[c.key] = c; });
  T.parts.forEach(function (p) { PART[p.no] = p; });
  Object.keys(QB).forEach(function (no) {
    QB[no].forEach(function (q) { q.n = +no; ITEM[q.i] = q; });
  });
  PR.forEach(function (p, i) { p.id = "P" + i; });
  var PR_BY = {};
  PR.forEach(function (p) { (PR_BY[p.n] = PR_BY[p.n] || []).push(p); });

  function qs(no) { return QB[String(no)] || []; }
  function item(id) { return ITEM[id]; }
  function pairs(no) { return no == null ? PR : (PR_BY[no] || []); }
  function pair(id) { return PR[+String(id).slice(1)]; }

  /* ── 試験・直列・科目 ──
     試験一覧は catalog.js。学習者設定 — P.exam(試験 id)・P.series(直列 id)・P.subs(科目 id 群)・P.cur(今の科目)。
     ★ 2027 年の試験日はまだ公告前なので「予想」。学習者が変えたら「手動」。 */
  var C = window.CATALOG;
  function exam() { return (C && C.exam(P.exam)) || (C && C.EXAMS[0]) || { id: "", name: "", date: "2027-04-03" }; }
  function setExam(id, sid) {
    P.exam = id; P.series = sid || null;
    P.subs = C ? C.subsOf(id, sid) : [];
    if (!P.goalMine) P.goal = exam().date;
    savePref();
  }
  function subs() { return (P.subs && P.subs.length) ? P.subs.slice() : [T.key || "_sample"]; }
  function cur() { return window.TJ_CUR || T.key; }
  function setCur(id) { P.cur = id; savePref(); }
  function seriesName() { var s = C && C.series(P.exam, P.series); return s ? s.name : ""; }
  /* 旧名称との互換 — 画面のいくつかが track() を呼ぶ */
  function track() { var e = exam(); return { id: e.id, name: e.name + (seriesName() ? " " + seriesName() : ""), exam: e.name, date: e.date }; }
  function setTrack(id) { setExam(id, P.series); }
  /* 試験日が決まっていない試験(危険物・消防設備士)は goal() が今日を仮に返す。goalSet() で「入力済みか」を見る(2026-10-09 試験日の画面が落ちていた) */
  function goal() { return P.goal || exam().date || TODAY; }
  function goalSet() { return !!(P.goal || exam().date); }
  function goalMark() { return P.goalMine ? "手動" : "予想"; }
  function setGoal(d, mine) { P.goal = d || null; P.goalMine = !!mine; savePref(); }
  function dday() { return dayNo(goal()) - TODAYN; }

  function minutes() { return P.minutes || 15; }
  function setMinutes(m) { P.minutes = m; savePref(); delete S.today; save(); }
  function name() { return P.name || ""; }
  function setName(v) { P.name = String(v || "").trim().slice(0, 12); savePref(); }
  function onboarded() { return !!P.onboarded; }
  function setOnboarded() { P.onboarded = ymd(); savePref(); }

  /* ── 記録・間隔復習 ──
     箱 0~5、次に見る日まで [0,1,3,7,14,30] 日。
     確実＋正解は 1 段階上げ、半々・当てずっぽうの正解は 1 段目のまま、間違えたら 0 段目（今日また）。 */
  var GAP = [0, 1, 3, 7, 14, 30];
  function answer(id, ok, x) {
    x = x || {};
    var a = S.ans[id] || { n: 0, box: 0 };
    a.n = (a.n || 0) + 1;
    a.ok = !!ok; a.at = Date.now(); a.conf = x.conf || null; a.ms = x.ms || 0;
    if (ok) a.box = x.conf === "sure" ? Math.min(5, (a.box || 0) + 1) : Math.max(1, Math.min(a.box || 0, 1));
    else a.box = 0;
    a.due = TODAYN + GAP[a.box];
    if (x.kind) a.kind = x.kind;
    S.ans[id] = a;
    var d = S.days[TODAY] || (S.days[TODAY] = { n: 0, ok: 0, ms: 0 });
    d.n++; if (ok) d.ok++; d.ms += Math.min(x.ms || 0, 60000);
    save();
    return a;
  }
  function pairAnswer(pid, ok) {
    S.pairs[pid] = { ok: !!ok, at: Date.now() };
    var d = S.days[TODAY] || (S.days[TODAY] = { n: 0, ok: 0, ms: 0 });
    d.n++; if (ok) d.ok++;
    save();
  }
  function answered(id) { return S.ans[id] || null; }
  function reset() { S = { ans: {}, days: {}, pairs: {} }; save(); }

  /* ── 習熟度 — 韓国版と同じ式：どれだけ解いたか 55 ＋ どれだけ合っているか 45 ── */
  function nodeStat(no) {
    var list = qs(no), solved = 0, correct = 0, last = null;
    for (var i = 0; i < list.length; i++) {
      var a = S.ans[list[i].i];
      if (a) { solved++; if (a.ok) correct++; if (!last || a.at > last) last = a.at; }
    }
    var n = list.length;
    var pct = solved ? Math.round(correct / solved * 100) : null;
    var prog = n ? Math.round(solved / n * 100) : 0;
    /* ★ 正解率は 10 文解くまで重みを弱める — そのままだと 1 文正解しただけで習熟度 46% になってしまう */
    var achieve = n ? Math.round(prog * 0.55 + (pct === null ? 0 : pct) * 0.45 * Math.min(1, solved / 10)) : 0;
    return { no: no, n: n, solved: solved, correct: correct, pct: pct, prog: prog, achieve: achieve, lastAt: last,
             mastery: solved ? correct / solved : null,
             state: !n ? "empty" : achieve >= 80 ? "done" : solved ? "wip" : "none" };
  }
  function agg(nos) {
    var n = 0, solved = 0, correct = 0, ach = 0, cnt = 0, last = null, vol = 0;
    nos.forEach(function (no) {
      var st = nodeStat(no), nd = NODE[no];
      n += st.n; solved += st.solved; correct += st.correct; ach += st.achieve; cnt++; vol += (nd ? nd.vol : 0);
      if (st.lastAt && (!last || st.lastAt > last)) last = st.lastAt;
    });
    return { n: n, solved: solved, correct: correct, nodes: cnt, vol: vol,
             pct: solved ? Math.round(correct / solved * 100) : null,
             prog: n ? Math.round(solved / n * 100) : 0, achieve: cnt ? Math.round(ach / cnt) : 0, lastAt: last };
  }
  function chStat(key) { return agg((CH[key] || { nodes: [] }).nodes); }
  function partNodes(no) {
    var acc = [];
    (PART[no] || { chs: [] }).chs.forEach(function (k) { acc = acc.concat(CH[k].nodes); });
    return acc;
  }
  function partStat(no) { return agg(partNodes(no)); }
  function overall() {
    var o = agg(T.nodes.map(function (n) { return n.no; }));
    o.done = T.nodes.filter(function (n) { return nodeStat(n.no).state === "done"; }).length;
    o.started = T.nodes.filter(function (n) { return nodeStat(n.no).solved > 0; }).length;
    o.total = T.nodes.length;
    return o;
  }

  /* ── 文を選ぶ ──
     同じ論点なら **自分の直列の過去問 → 直近の年 → 割り当てが確かなもの** の順で先に出す。 */
  function rank(q) {
    var s = 0;
    if (q.e === exam().name) s += 4;
    s += Math.max(0, (q.y || 2015) - 2015) * 0.3;
    if (q.c === "A") s += 1;
    return s;
  }
  function freshOf(no, k) {
    return qs(no).filter(function (q) { return !S.ans[q.i]; })
      .sort(function (a, b) { return rank(b) - rank(a); }).slice(0, k);
  }
  /* 今日見る復習 — 期限が来たもの。間違えたもの（0 段目）が先 */
  function dueList() {
    return Object.keys(S.ans).filter(function (id) {
      var a = S.ans[id]; return ITEM[id] && a.due != null && a.due <= TODAYN && !(a.at && ymd(new Date(a.at)) === TODAY && a.ok);
    }).sort(function (a, b) { return (S.ans[a].box - S.ans[b].box) || (S.ans[a].at - S.ans[b].at); });
  }
  function wrongList() {
    return Object.keys(S.ans).filter(function (id) { return ITEM[id] && !S.ans[id].ok; })
      .sort(function (a, b) { return S.ans[b].at - S.ans[a].at; });
  }

  /* 今日掘り下げる論点 — 過去問が多く(q)、まだ足りていないところ。配置試験で弱かった編に重みを足す */
  function focusNodes(k) {
    var weakPart = (S.place && S.place.weakPart) || null;
    return T.nodes.filter(function (n) { return n.q > 0 && freshOf(n.no, 1).length; })
      .map(function (n) {
        var st = nodeStat(n.no), left = 1 - st.prog / 100;
        var w = Math.sqrt(n.q) * (0.35 + left) * (st.mastery != null && st.mastery < 0.6 ? 1.4 : 1)
              * (weakPart && n.part === weakPart ? 1.3 : 1) * (st.solved && st.prog < 100 ? 1.25 : 1);
        return { n: n, w: w };
      })
      .sort(function (a, b) { return b.w - a.w; }).slice(0, k || 3).map(function (x) { return x.n; });
  }

  /* ── 今日やること ──
     ★ 分量は時間である。1 文の〇×は確信度＋回答＋判定を読む時間を合わせて約 20 秒とみなす
       （実測前の見積り — 画面にも「約」を付ける）。15 分 → 45 文くらい。
     ★ 1 日 1 回決めて保存する。リロードのたびに変わると学習者が終わりを見られない。 */
  var SEC_PER = 20, SEC_MC = 60;
  function today() {
    if (S.today && S.today.date === TODAY && S.today.min === minutes()) return decorate(S.today);
    /* ★ 分量は時間（秒）で満たす — 1 文の〇×は約 20 秒、過去問を解く（資料・4~5択）は約 60 秒（見積り、実測前）。
       国語・英語のように「過去問を解く」しか無い科目で 15 分に 45 問を割り当てると終わりまで行けない。 */
    function 秒数(id) { var q = ITEM[id]; return q && q.mc ? SEC_MC : SEC_PER; }
    var 予算 = minutes() * 60, 使った = 0;
    var due = [];
    dueList().forEach(function (id) { if (使った + 秒数(id) <= 予算 * 0.5) { due.push(id); 使った += 秒数(id); } });
    var foci = focusNodes(3), fresh = [], 済み = {};
    function 詰める(no, 上限) {
      freshOf(no, 60).some(function (q) {
        if (使った + 秒数(q.i) > 上限 || 済み[q.i]) return 使った + SEC_PER > 上限;
        fresh.push(q.i); 済み[q.i] = 1; 使った += 秒数(q.i); return false;
      });
    }
    var 配分 = (予算 - 40 - 使った) / Math.max(1, foci.length);   /* ペア用に 40 秒は残す */
    foci.forEach(function (n, i) { 詰める(n.no, 使った + 配分); });
    if (使った < 予算 - 60) focusNodes(12).slice(3).forEach(function (n) { if (使った < 予算 - 60) 詰める(n.no, 予算 - 40); });
    /* 紛らわしいペア 2 つ — 今日の論点から、まだ解いていないもの */
    var ps = [];
    foci.forEach(function (n) { pairs(n.no).forEach(function (p) { if (!S.pairs[p.id] && ps.length < 2) ps.push(p.id); }); });
    if (ps.length < 2) PR.forEach(function (p) { if (!S.pairs[p.id] && ps.length < 2) ps.push(p.id); });
    /* 順序 — 復習を先に、新しい文の合間にペアを挟む */
    var seq = due.map(function (id) { return { k: "ox", id: id, re: 1 }; });
    fresh.forEach(function (id, i) {
      seq.push({ k: "ox", id: id });
      if (ps.length && (i === Math.floor(fresh.length / 3) || i === Math.floor(fresh.length * 2 / 3))) seq.push({ k: "pair", id: ps.shift() });
    });
    ps.forEach(function (id) { seq.push({ k: "pair", id: id }); });
    S.today = { date: TODAY, min: minutes(), seq: seq, foci: foci.map(function (n) { return n.no; }), pos: 0 };
    save();
    return decorate(S.today);
  }
  function decorate(t) {
    var done = 0;
    t.seq.forEach(function (s) { if (s.done) done++; });
    return { date: t.date, min: t.min, seq: t.seq, foci: t.foci.map(function (no) { return NODE[no]; }),
             total: t.seq.length, done: done, re: t.seq.filter(function (s) { return s.re; }).length,
             finished: done >= t.seq.length };
  }
  function markToday(i) { if (S.today && S.today.seq[i]) { S.today.seq[i].done = 1; save(); } }

  /* ── 連続日数・カレンダー ── */
  function streak() {
    var n = 0, d = new Date();
    if (!S.days[ymd(d)]) d.setDate(d.getDate() - 1);   /* 今日まだやっていなければ昨日から数える */
    while (S.days[ymd(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  /* ── 等級 — 盾バッジ。
     長く覚えている文（間隔復習の箱が 3 段以上＝7 日を超えて残ったもの）が
     その科目全体に占める割合で等級を決める。 */
  var TIERS = ["ブロンズ", "シルバー", "ゴールド", "プラチナ", "ダイヤ"], TIER_CUT = [0, 0.05, 0.15, 0.3, 0.5];
  function tier() {
    var n = 0, held = 0;
    Object.keys(QB).forEach(function (k) { n += QB[k].length; });
    Object.keys(S.ans).forEach(function (id) { if (ITEM[id] && S.ans[id].box >= 3) held++; });
    var r = n ? held / n : 0, t = 0;
    for (var i = 0; i < TIER_CUT.length; i++) if (r >= TIER_CUT[i]) t = i;
    var lo = TIER_CUT[t], hi = TIER_CUT[t + 1] || 1, step = (r - lo) / (hi - lo);
    var div = t === 4 ? "" : step < 1 / 3 ? " III" : step < 2 / 3 ? " II" : " I";
    return { name: TIERS[t] + div, rank: t, held: held, n: n };
  }
  /* ★ 等級バッジを最初から見せる試験区分は韓国版では消防・警察だけだった（市場調査ベースの初期値）。
     この空の枠には試験区分の区別がまだ無いので、既定は「オフ」にしておく —
     実際の試験を追加するときに、必要ならここへ判定を足す。 */
  function tierOn() { return P.tierOn != null ? !!P.tierOn : false; }
  function setTierOn(v) { P.tierOn = !!v; savePref(); }
  function days() { return S.days; }
  function todayCount() { return (S.days[TODAY] || { n: 0 }).n; }

  /* ── 配置試験 20 問 ──
     論点 20 か所から 1 つずつ — 過去問が多い論点から、編がまんべんなく混ざるように。
     制限時間内に読める長さ（90 字以下）だけ。毎日同じものが出ないよう日付で混ぜる。 */
  function placementSet(k) {
    k = k || 20;
    var byPart = {};
    T.nodes.filter(function (n) { return n.q >= 8; }).sort(function (a, b) { return b.q - a.q; })
      .forEach(function (n) { (byPart[n.part] = byPart[n.part] || []).push(n); });
    var picks = [], parts = Object.keys(byPart), r = 0;
    while (picks.length < k && r < 40) {
      parts.forEach(function (p) { if (picks.length < k && byPart[p][r]) picks.push(byPart[p][r]); });
      r++;
    }
    var seed = TODAYN;
    /* ★ 〇×を半々に — 全体の選択肢は 〇 が多くなりがちで、そのまま抜くと「全部〇」で当ててしまえる */
    return picks.map(function (n, i) {
      var want = i % 2 ? "X" : "O";
      var c = qs(n.no).filter(function (q) { return q.c === "A" && !q.sa && !q.mc && q.t.length <= 90 && q.t.length >= 25; });
      if (!c.length) c = qs(n.no).filter(function (q) { return !q.mc; });
      if (!c.length) return null;            /* 過去問を解くだけの科目（国語・英語）は配置試験に使わない */
      var w = c.filter(function (q) { return q.ox === want; });
      if (w.length) c = w;
      return c[(seed + n.no * 7) % c.length];
    }).filter(Boolean);
  }
  function setPlacement(rec) {
    /* rec = [{id, ok, ms, to}] */
    var per = {};
    rec.forEach(function (r) {
      var q = ITEM[r.id]; if (!q) return;
      var p = NODE[q.n].part;
      per[p] = per[p] || { n: 0, ok: 0 }; per[p].n++; if (r.ok) per[p].ok++;
    });
    var weak = Object.keys(per).sort(function (a, b) { return per[a].ok / per[a].n - per[b].ok / per[b].n; })[0];
    S.place = { at: Date.now(), n: rec.length, ok: rec.filter(function (r) { return r.ok; }).length,
                per: per, weakPart: weak ? +weak : null };
    delete S.today;
    save();
    return S.place;
  }

  /* ── 2 つの文がどこで分かれるか ──
     ★ 日本語には韓国語のような語区切りの空白が無いので、韓国版の「単語ごとに比べる」方式は使えない。
       代わりに、先頭からの共通部分（接頭辞）と末尾からの共通部分（接尾辞）を文字単位で探し、
       その間の食い違う部分だけを <mark> で塗る。引っかけ文はたいてい前後が同じで真ん中だけが違うので、
       この単純な方式で実用上十分に効く。 */
  function markDiff(a, b) {
    a = a || ""; b = b || "";
    var i = 0, la = a.length, lb = b.length;
    while (i < la && i < lb && a[i] === b[i]) i++;
    var j = 0, maxTail = Math.min(la - i, lb - i);
    while (j < maxTail && a[la - 1 - j] === b[lb - 1 - j]) j++;
    function paint(s) {
      var head = s.slice(0, i), mid = s.slice(i, s.length - j), tail = s.slice(s.length - j);
      return esc(head) + (mid ? "<mark>" + esc(mid) + "</mark>" : "") + esc(tail);
    }
    return [paint(a), paint(b)];
  }

  /* ── テーマ ── */
  var SKINS = [
    { v: "white", n: "ホワイト", c: "#FFFFFF" },
    { v: "jelly", n: "ゼリー", c: "#FFD3E6" },
    { v: "night", n: "ナイト", c: "#0B0D11" }
  ];
  function skin() { try { return localStorage.getItem(SKIN) || "white"; } catch (e) { return "white"; } }
  function setSkin(v) {
    try { localStorage.setItem(SKIN, v); } catch (e) {}
    document.documentElement.dataset.skin = v;
    window.dispatchEvent(new CustomEvent("terra:skin"));
  }

  /* ── ナビ — 4 つ。スマホでは下タブ ── */
  var ICON = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
    tree: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="5"/><circle cx="21" cy="11" r="1.2" fill="currentColor"/></svg>',
    drill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
    set: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>'
  };
  var PAGES = [["index.html", "ホーム", "home"], ["skilltree.html", "スキルツリー", "tree"],
               ["drill.html", "トレーニング", "drill"], ["settings.html", "設定", "set"]];
  function mountNav(here) {
    /* 初めて来た人は最初の設定へ — 検査機（webdriver）は送らない */
    if (!onboarded() && here !== "start.html" && !navigator.webdriver && !/[?&]nostart/.test(location.search)) {
      location.replace("start.html"); return;
    }
    var nav = document.createElement("div");
    nav.className = "nav";
    nav.innerHTML = '<div class="in"><a class="logo" href="index.html"><i></i>' + esc(window.BRAND || T.brand) +
      '<span class="sub">' + esc(T.subject) + "</span></a>" +
      '<nav class="navlinks">' + PAGES.map(function (p) {
        return '<a href="' + p[0] + '"' + (p[0] === here ? ' class="on"' : "") + ">" + p[1] + "</a>";
      }).join("") + "</nav></div>";
    document.body.insertBefore(nav, document.body.firstChild);
    var tab = document.createElement("nav");
    tab.className = "tabbar";
    tab.innerHTML = PAGES.map(function (p) {
      return '<a href="' + p[0] + '"' + (p[0] === here ? ' class="on"' : "") + ">" + ICON[p[2]] + "<span>" + p[1] + "</span></a>";
    }).join("");
    document.body.appendChild(tab);
  }
  function mountNext() {}   /* 旧スキルツリーが呼ぶ。この版はホームが勧めるので空にしておく */

  function esc(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function num(n) { return (n || 0).toLocaleString("ja-JP"); }
  function src(q) { return (q.y ? q.y + "年 " : "") + (q.e || "") + (q.qn ? " 問" + q.qn : "") + (q.m ? " " + q.m : ""); }

  function exportData() { return JSON.stringify({ v: 1, pref: P, rec: S }); }
  function importData(txt) {
    var o = JSON.parse(txt);
    if (!o || !o.rec) throw new Error("形式が違います");
    S = o.rec; P = o.pref || P; save(); savePref();
  }

  window.GB = {
    T: T, Q: QB, subject: T.subject, brand: window.BRAND || T.brand,
    NODE: NODE, CH: CH, PART: PART, nodes: T.nodes, chs: T.chs, parts: T.parts,
    node: function (no) { return NODE[no]; }, ch: function (k) { return CH[k]; }, part: function (n) { return PART[n]; },
    nodesOf: function (k) { return (CH[k] || { nodes: [] }).nodes.map(function (n) { return NODE[n]; }); },
    chsOf: function (p) { return (PART[p] || { chs: [] }).chs.map(function (k) { return CH[k]; }); },
    partNodes: partNodes,
    qs: qs, item: item, pairs: pairs, pair: pair, markDiff: markDiff,
    nodeStat: nodeStat, chStat: chStat, partStat: partStat, overall: overall,
    answer: answer, pairAnswer: pairAnswer, answered: answered, reset: reset,
    dueList: dueList, wrongList: wrongList, focusNodes: focusNodes, freshOf: freshOf,
    today: today, markToday: markToday, streak: streak, todayCount: todayCount, tier: tier, tierOn: tierOn, setTierOn: setTierOn, days: days, SEC_PER: SEC_PER,
    placementSet: placementSet, setPlacement: setPlacement, placement: function () { return S.place || null; },
    track: track, setTrack: setTrack, exam: exam, setExam: setExam, subs: subs, cur: cur, setCur: setCur, seriesName: seriesName, goal: goal, goalSet: goalSet, goalMark: goalMark, setGoal: setGoal, dday: dday,
    minutes: minutes, setMinutes: setMinutes, name: name, setName: setName,
    onboarded: onboarded, setOnboarded: setOnboarded,
    skin: skin, setSkin: setSkin, SKINS: SKINS,
    mountNav: mountNav, mountNext: mountNext,
    esc: esc, num: num, src: src, ymd: ymd,
    exportData: exportData, importData: importData,
    state: function () { return S; }
  };
})();
