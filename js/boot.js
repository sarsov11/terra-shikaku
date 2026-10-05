/* 今勉強している科目の資料（data/<id>.js）を読み込む — 各画面で store.js より前に置く。
   js/brand.js・catalog.js・data/ready.js が先に読み込まれている必要がある。
   選んだ科目がまだ準備中なら、その学習者の科目のうち準備できている最初の科目 →
   それも無ければ準備できている科目を何でも 1 つ。
   ★ 保存キーの接頭辞はこのアプリでは "tj." を使う（韓国版の jg.・mj. と重ならないように —
     同じ github.io から配る場合、ブラウザの保存領域が混ざってしまう）。 */
(function () {
  "use strict";
  var P = {};
  try { P = JSON.parse(localStorage.getItem("tj.pref.v1") || "{}"); } catch (e) {}
  var R = window.READY || {};
  var want = new URLSearchParams(location.search).get("s");
  var cur = want && R[want] ? want : P.cur;
  if (!R[cur]) cur = (P.subs || []).filter(function (s) { return R[s]; })[0] || Object.keys(R)[0];
  if (want && R[want] && P.cur !== want) {
    P.cur = want;
    try { localStorage.setItem("tj.pref.v1", JSON.stringify(P)); } catch (e) {}
  }
  window.TJ_CUR = cur;
  if (cur) document.write('<script src="data/' + cur + '.js?v=' + (R[cur].v || "") + '"><\/script>');

  /* ブランド差し込み — <title> の中の {{BRAND}} を js/brand.js で決めた名前に置き換える。
     画面ごとにここで 1 回やればよい（ナビのロゴ名は store.js 側で別に入れる）。 */
  if (window.BRAND) document.title = document.title.replace(/\{\{BRAND\}\}/g, window.BRAND);
})();
