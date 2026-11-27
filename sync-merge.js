/* 複習清單／進度合併（本機 + 雲端）。
   給 Node 測試與瀏覽器一起用。不依賴 Firebase。
   本機 UI 形狀維持不變：
     review: { [id]: { n, t, why } }
     unf:    { [id]: number }
     done:   { [id]: true }
     quiz:   { [id]: number }
   另外寫在同一個 localStorage key 裡、UI 不讀的欄位：
     tomb:   { review:{}, unf:{}, done:{}, quiz:{} }  // 刪除時間（tombstones）
     doneAt: { [id]: ts }
     quizAt: { [id]: ts }
   雲端 users/{uid} 形狀：各 map 的值帶 updatedAt，刪除則 { deleted:true, updatedAt }。
   我的單語（v3.39）另存在 localStorage nhStudy.mine：{ items:{ [id]:{ja,kana,zh,note,pos,t,u} }, tomb:{ [id]: ts } }
     雲端欄位 mine：{ [id]: {ja,kana,zh,note,pos,t,updatedAt} | {deleted:true, updatedAt} }，以 id 合併、較新者勝、刪除用 tombstone。
     merge() 只有在任一邊有 mine 時才輸出 mine 欄位（舊資料形狀不變）。
   🏷 時間註記（v3.42）另存在 localStorage nhStudy.marks：{ items:{ [句子key]:{l,t,u} }, tomb:{ [句子key]: ts } }
     雲端欄位 marks：{ [句子key]: {l,t,updatedAt} | {deleted:true, updatedAt} }，同樣以 key 合併、較新者勝、刪除用 tombstone。
*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SyncMerge = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const KINDS = ['review', 'unf', 'done', 'quiz'];

  function emptyPacked() {
    return { review: {}, unf: {}, done: {}, quiz: {}, updatedAt: 0 };
  }

  function ensureMeta(S) {
    if (!S.tomb || typeof S.tomb !== 'object') S.tomb = {};
    KINDS.forEach(k => { if (!S.tomb[k] || typeof S.tomb[k] !== 'object') S.tomb[k] = {}; });
    if (!S.doneAt || typeof S.doneAt !== 'object') S.doneAt = {};
    if (!S.quizAt || typeof S.quizAt !== 'object') S.quizAt = {};
    return S;
  }

  function tomb(S, kind, key, ts) {
    ensureMeta(S);
    S.tomb[kind][key] = ts || Date.now();
    if (kind === 'done') delete S.doneAt[key];
    if (kind === 'quiz') delete S.quizAt[key];
  }

  function tombAll(S, kind, ts) {
    ts = ts || Date.now();
    Object.keys(S[kind] || {}).forEach(k => tomb(S, kind, k, ts));
  }

  function packLocal(S, now) {
    now = now || Date.now();
    ensureMeta(S);
    const out = emptyPacked();

    Object.entries(S.review || {}).forEach(([k, v]) => {
      if (!v) return;
      const updatedAt = Math.max(+v.t || 0, 0) || now;
      out.review[k] = { n: v.n || 0, t: v.t || updatedAt, why: v.why || '', updatedAt };
    });
    Object.entries(S.tomb.review).forEach(([k, ts]) => {
      if (out.review[k]) return;
      out.review[k] = { deleted: true, updatedAt: +ts || now };
    });

    Object.entries(S.unf || {}).forEach(([k, t]) => {
      const updatedAt = typeof t === 'number' ? t : now;
      out.unf[k] = { t: updatedAt, updatedAt };
    });
    Object.entries(S.tomb.unf).forEach(([k, ts]) => {
      if (out.unf[k]) return;
      out.unf[k] = { deleted: true, updatedAt: +ts || now };
    });

    Object.entries(S.done || {}).forEach(([k, v]) => {
      if (!v) return;
      if (!S.doneAt[k]) S.doneAt[k] = now;
      out.done[k] = { updatedAt: S.doneAt[k] };
    });
    Object.entries(S.tomb.done).forEach(([k, ts]) => {
      if (out.done[k]) return;
      out.done[k] = { deleted: true, updatedAt: +ts || now };
    });

    Object.entries(S.quiz || {}).forEach(([k, score]) => {
      if (score == null) return;
      if (!S.quizAt[k]) S.quizAt[k] = now;
      out.quiz[k] = { score: +score, updatedAt: S.quizAt[k] };
    });
    Object.entries(S.tomb.quiz).forEach(([k, ts]) => {
      if (out.quiz[k]) return;
      out.quiz[k] = { deleted: true, updatedAt: +ts || now };
    });

    out.updatedAt = now;
    return out;
  }

  function pickNewer(a, b) {
    if (!a) return b;
    if (!b) return a;
    const ta = a.updatedAt || 0, tb = b.updatedAt || 0;
    if (ta !== tb) return ta > tb ? a : b;
    if (a.deleted && !b.deleted) return b;
    if (b.deleted && !a.deleted) return a;
    return a;
  }

  function mergeQuiz(a, b) {
    if (!a) return b;
    if (!b) return a;
    if (!a.deleted && !b.deleted) {
      const score = Math.max(a.score || 0, b.score || 0);
      const updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
      const src = (a.score || 0) >= (b.score || 0) ? a : b;
      return { score, updatedAt, ...(src && src.n != null ? { n: src.n } : {}) };
    }
    return pickNewer(a, b);
  }

  function mergeDone(a, b) {
    if (!a) return b;
    if (!b) return a;
    if (!a.deleted && !b.deleted) {
      return { updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0) };
    }
    return pickNewer(a, b);
  }

  function mergeMaps(a, b, kind) {
    const out = {};
    const keys = new Set([].concat(Object.keys(a || {}), Object.keys(b || {})));
    keys.forEach(k => {
      if (kind === 'quiz') out[k] = mergeQuiz(a[k], b[k]);
      else if (kind === 'done') out[k] = mergeDone(a[k], b[k]);
      else out[k] = pickNewer(a[k], b[k]);
    });
    return out;
  }

  function merge(localPacked, cloud) {
    const l = localPacked || emptyPacked();
    const c = cloud || emptyPacked();
    const out = {
      review: mergeMaps(l.review, c.review, 'review'),
      unf: mergeMaps(l.unf, c.unf, 'unf'),
      done: mergeMaps(l.done, c.done, 'done'),
      quiz: mergeMaps(l.quiz, c.quiz, 'quiz'),
      updatedAt: Math.max(l.updatedAt || 0, c.updatedAt || 0)
    };
    if (l.mine || c.mine) out.mine = mergeMine(l.mine, c.mine);
    if (l.marks || c.marks) out.marks = mergeMarks(l.marks, c.marks);
    return out;
  }

  /* ---- 我的單語 ---- */
  const MINE_FIELDS = ['ja', 'kana', 'zh', 'note', 'pos', 't', 'ref'];
  /* v3.45：src＝這個字是從哪些句子加入的 { [句子key]: {t 加入時間, u 更新時間, on 1/0} }。
     on:0 是「只移除這一句」的 tombstone；兩台裝置以句子 key 合併、較新者勝（不會因為字本身較新就丟掉另一台加的句子）。 */
  function cleanSrc(src) {
    if (!src || typeof src !== 'object') return null;
    const out = {};
    Object.keys(src).forEach(k => { const v = src[k]; if (!v || typeof v !== 'object') return;
      out[k] = { t: +v.t || 0, u: +v.u || +v.t || 0, on: v.on === 0 || v.on === false ? 0 : 1 }; });
    return Object.keys(out).length ? out : null;
  }
  function mergeSrc(a, b) {
    a = cleanSrc(a) || {}; b = cleanSrc(b) || {};
    const out = {};
    new Set([].concat(Object.keys(a), Object.keys(b))).forEach(k => {
      const x = a[k], y = b[k];
      if (!x) { out[k] = y; return; } if (!y) { out[k] = x; return; }
      if (x.u !== y.u) { out[k] = x.u > y.u ? x : y; return; }
      out[k] = x.on ? x : y;
    });
    return Object.keys(out).length ? out : null;
  }
  function mergeMine(a, b) {
    a = a || {}; b = b || {};
    const out = {};
    new Set([].concat(Object.keys(a), Object.keys(b))).forEach(id => {
      const x = a[id], y = b[id], w = pickNewer(x, y);
      if (x && y && !x.deleted && !y.deleted && (x.src || y.src)) {
        const e = Object.assign({}, w), src = mergeSrc(x.src, y.src);
        if (src) e.src = src; else delete e.src;
        e.updatedAt = Math.max(x.updatedAt || 0, y.updatedAt || 0);
        out[id] = e;
      } else out[id] = w;
    });
    return out;
  }
  function packMine(store, now) {
    now = now || Date.now();
    const out = {};
    const items = (store && store.items) || {}, tombs = (store && store.tomb) || {};
    Object.keys(items).forEach(id => {
      const v = items[id]; if (!v) return;
      const e = {}; MINE_FIELDS.forEach(f => { if (v[f] != null) e[f] = v[f]; });
      const src = cleanSrc(v.src); if (src) e.src = src;
      e.updatedAt = +v.u || +v.t || now;
      out[id] = e;
    });
    Object.keys(tombs).forEach(id => {
      if (out[id] && out[id].updatedAt >= (+tombs[id] || 0)) return;
      out[id] = { deleted: true, updatedAt: +tombs[id] || now };
    });
    return out;
  }
  function applyMine(store, packed) {
    const items = {}, tomb = {};
    Object.keys(packed || {}).forEach(id => {
      const v = packed[id]; if (!v) return;
      if (v.deleted) { tomb[id] = v.updatedAt || 0; return; }
      const e = {}; MINE_FIELDS.forEach(f => { if (v[f] != null) e[f] = v[f]; });
      const src = cleanSrc(v.src); if (src) e.src = src;
      e.u = v.updatedAt || 0;
      items[id] = e;
    });
    store.items = items; store.tomb = tomb;
    return store;
  }
  function mineSig(store) {
    const it = (store && store.items) || {};
    return Object.keys(it).sort().map(id => id + '@' + (it[id].u || 0) + (it[id].src ? '~' + Object.keys(it[id].src).sort().map(k => k + '=' + it[id].src[k].on + '.' + it[id].src[k].u).join(',') : '')).join('|');
  }

  /* ---- 🏷 時間註記 ---- */
  const MARK_FIELDS = ['l', 't'];
  function mergeMarks(a, b) { return mergeMaps(a || {}, b || {}, 'marks'); }
  function packMarks(store, now) {
    now = now || Date.now();
    const out = {};
    const items = (store && store.items) || {}, tombs = (store && store.tomb) || {};
    Object.keys(items).forEach(k => {
      const v = items[k]; if (!v) return;
      const e = {}; MARK_FIELDS.forEach(f => { if (v[f] != null) e[f] = v[f]; });
      e.updatedAt = +v.u || +v.t || now;
      out[k] = e;
    });
    Object.keys(tombs).forEach(k => {
      if (out[k] && out[k].updatedAt >= (+tombs[k] || 0)) return;
      out[k] = { deleted: true, updatedAt: +tombs[k] || now };
    });
    return out;
  }
  function applyMarks(store, packed) {
    const items = {}, tomb = {};
    Object.keys(packed || {}).forEach(k => {
      const v = packed[k]; if (!v) return;
      if (v.deleted) { tomb[k] = v.updatedAt || 0; return; }
      const e = {}; MARK_FIELDS.forEach(f => { if (v[f] != null) e[f] = v[f]; });
      e.u = v.updatedAt || 0;
      items[k] = e;
    });
    store.items = items; store.tomb = tomb;
    return store;
  }
  function marksSig(store) {
    const it = (store && store.items) || {};
    return Object.keys(it).sort().map(k => k + '@' + (it[k].u || 0)).join('|');
  }

  function applyToLocal(S, packed) {
    ensureMeta(S);
    const review = {};
    S.tomb.review = {};
    Object.entries((packed && packed.review) || {}).forEach(([k, v]) => {
      if (v && v.deleted) S.tomb.review[k] = v.updatedAt;
      else if (v) review[k] = { n: v.n || 0, t: v.t || v.updatedAt || 0, why: v.why || '' };
    });
    S.review = review;

    const unf = {};
    S.tomb.unf = {};
    Object.entries((packed && packed.unf) || {}).forEach(([k, v]) => {
      if (v && v.deleted) S.tomb.unf[k] = v.updatedAt;
      else if (v) unf[k] = v.t || v.updatedAt;
    });
    S.unf = unf;

    const done = {};
    S.tomb.done = {};
    const doneAt = {};
    Object.entries((packed && packed.done) || {}).forEach(([k, v]) => {
      if (v && v.deleted) S.tomb.done[k] = v.updatedAt;
      else if (v) { done[k] = true; doneAt[k] = v.updatedAt; }
    });
    S.done = done;
    S.doneAt = doneAt;

    const quiz = {};
    S.tomb.quiz = {};
    const quizAt = {};
    Object.entries((packed && packed.quiz) || {}).forEach(([k, v]) => {
      if (v && v.deleted) S.tomb.quiz[k] = v.updatedAt;
      else if (v) { quiz[k] = v.score; quizAt[k] = v.updatedAt; }
    });
    S.quiz = quiz;
    S.quizAt = quizAt;
    return S;
  }

  /* pack local, merge with cloud, apply back. Returns the merged packed doc. */
  function mergeInto(S, cloud, now) {
    const merged = merge(packLocal(S, now), cloud);
    applyToLocal(S, merged);
    return merged;
  }

  // What the UI shows (live keys + quiz scores). Used to skip re-rendering when a sync changed nothing visible.
  function visibleSig(S) {
    const live = o => Object.keys(o || {}).filter(k => (o || {})[k]).sort().join('|');
    const q = Object.keys((S && S.quiz) || {}).sort().map(k => k + '=' + S.quiz[k]).join('|');
    return [live(S && S.review), live(S && S.unf), live(S && S.done), q].join('#');
  }
  // Local edits made while a cloud transaction was in flight are not in `merged`.
  // Re-merge the current local state on top so they are never overwritten.
  function rebase(S, merged, now) {
    return merge(packLocal(S, now), merged);
  }

  return { KINDS, emptyPacked, ensureMeta, tomb, tombAll, packLocal, merge, applyToLocal, mergeInto, pickNewer, visibleSig, rebase, packMine, applyMine, mergeMine, mineSig, mergeSrc, packMarks, applyMarks, mergeMarks, marksSig };
});
