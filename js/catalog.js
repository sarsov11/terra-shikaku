/* ═══════════════════════════════════════════════════════════
   {{BRAND}} — 試験・直列・科目カタログ（日本語版）

   最初の設定で「どの試験を受けますか？」→（直列がある試験なら）直列 → 科目 が決まる。
   科目ごとの資料は data/<file>.js に 1 本ずつ。資料がある科目だけ解け、無い科目は「準備中」。
   どの科目が準備できているかは data/ready.js（パイプライン産出物）が教える — ここに数を書かない。

   ★ 危険物取扱者・消防設備士は年に何度も試験があり、都道府県ごとに日程が異なるため、
     固定の試験日を書かない（架空の日付を作らない）。date は null のままにし、
     設定画面（settings.html の「試験日」欄）で学習者が自分の受験日を入力する。
     date が無いときは GB.goal() が今日を仮のゴールとして返すだけで、壊れはしない。
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  /* 科目 — key は data/ 以下のファイル名（英数字）。表示名は name。 */
  var SUBJECTS = {
    kb_byo_law:      { name: "危険物に関する法令" },
    kb_byo_sei:       { name: "危険物の性質並びにその火災予防及び消火の方法" },
    kb_byo_phys:      { name: "燃焼及び消火に関する基礎知識" },
    kb_otsu4_law:     { name: "危険物に関する法令" },
    kb_otsu4_sei:     { name: "危険物の性質並びにその火災予防及び消火の方法" },
    kb_otsu4_phys:    { name: "基礎的な物理学及び基礎的な化学" },
    sb_kou_all:       { name: "甲種（機械・電気に関する基礎知識／構造・機能・整備／法令）" },
    sb_otsu_all:      { name: "乙種（機械・電気に関する基礎知識／構造・機能・整備／法令）" },
    sb_otsu6_kiso:    { name: "基礎的知識" },
    sb_otsu6_kouzou:  { name: "構造・機能・整備" },
    sb_otsu6_law:     { name: "法令" }
  };

  /* 試験 — 直列が 1 つしか無い試験には series を持たせない。 */
  var EXAMS = [
    { id: "kikenbutsu", name: "危険物取扱者", sub: "年複数回実施（都道府県ごとに日程が異なる — 試験日は設定画面で入力）",
      date: null, series: [
        { id: "byo", name: "丙種", subs: ["kb_byo_law", "kb_byo_sei", "kb_byo_phys"] },
        { id: "otsu4", name: "乙種第4類", subs: ["kb_otsu4_law", "kb_otsu4_sei", "kb_otsu4_phys"] }
      ] },
    { id: "shobosetsubishi", name: "消防設備士", sub: "年複数回実施（都道府県ごとに日程が異なる — 試験日は設定画面で入力）",
      date: null, series: [
        { id: "kou", name: "甲種（全類共通）", subs: ["sb_kou_all"] },
        { id: "otsu", name: "乙種（全類共通）", subs: ["sb_otsu_all"] },
        { id: "otsu6", name: "乙種第6類", subs: ["sb_otsu6_law", "sb_otsu6_kiso", "sb_otsu6_kouzou"] }
      ] }
    /* ここに試験を追加する。直列が無い試験は series の代わりに subs を使う：
       { id: "xxx", name: "○○試験", sub: "…", date: "2027-xx-xx", subs: ["kihon"] } */
  ];

  function exam(id) { return EXAMS.filter(function (e) { return e.id === id; })[0] || null; }
  function series(examId, sid) {
    var e = exam(examId); if (!e || !e.series) return null;
    return e.series.filter(function (s) { return s.id === sid; })[0] || null;
  }
  /* この学習者が受ける科目 — 試験・直列から決まる */
  function subsOf(examId, sid) {
    var e = exam(examId); if (!e) return [];
    if (!e.series) return e.subs.slice();
    var s = series(examId, sid); return s ? s.subs.slice() : [];
  }
  function ready(id) { return !!(window.READY && window.READY[id]); }
  function count(id) { return (window.READY && window.READY[id] && window.READY[id].n) || 0; }

  window.CATALOG = { SUBJECTS: SUBJECTS, EXAMS: EXAMS, exam: exam, series: series, subsOf: subsOf,
                     ready: ready, count: count,
                     name: function (id) { return (SUBJECTS[id] || { name: id }).name; } };
})();
