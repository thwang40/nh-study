#!/usr/bin/env node
'use strict';
// 🏷 時間註記（nhStudy.marks）同步合併測試
const assert = require('assert');
const M = require('./sync-merge.js');
let passed = 0;
function t(name, fn) { fn(); passed++; console.log('ok  ' + name); }
const S0 = () => ({ review: {}, unf: {}, done: {}, quiz: {} });
const store = (items, tomb) => ({ items: items || {}, tomb: tomb || {} });
const mk = (l, t, u) => ({ l, t, u: u == null ? t : u });

t('docs without marks keep their old shape', () => {
  const m = M.merge(M.packLocal(S0(), 1), M.emptyPacked());
  assert.ok(!('marks' in m));
});
t('first upload: local marks reach the cloud intact', () => {
  const p = M.packLocal(S0(), 10); p.marks = M.packMarks(store({ 't18:3': mk(18, 5) }));
  const m = M.merge(p, M.emptyPacked());
  assert.deepStrictEqual(m.marks['t18:3'], { l: 18, t: 5, updatedAt: 5 });
});
t('union of marks made on two devices (many marks per lesson)', () => {
  const m = M.mergeMarks(M.packMarks(store({ 't18:3': mk(18, 5), '18-T1:2': mk(18, 6) })), M.packMarks(store({ 'g18-1:0': mk(18, 7) })));
  const s = M.applyMarks(store(), m);
  assert.deepStrictEqual(Object.keys(s.items).sort(), ['18-T1:2', 'g18-1:0', 't18:3']);
});
t('same sentence: newer 更新時間 wins', () => {
  const m = M.mergeMarks(M.packMarks(store({ 't18:3': mk(18, 5) })), M.packMarks(store({ 't18:3': mk(18, 90) })));
  assert.strictEqual(m['t18:3'].t, 90);
  const s = M.applyMarks(store(), m); assert.strictEqual(s.items['t18:3'].t, 90); assert.strictEqual(s.items['t18:3'].u, 90);
});
t('刪除 on one device removes it on the other (tombstone newer)', () => {
  const m = M.mergeMarks(M.packMarks(store({}, { 't18:3': 20 })), M.packMarks(store({ 't18:3': mk(18, 5) })));
  const s = M.applyMarks(store({ 't18:3': mk(18, 5) }), m);
  assert.ok(!s.items['t18:3']); assert.strictEqual(s.tomb['t18:3'], 20);
});
t('marking again after an older delete brings it back', () => {
  const m = M.mergeMarks(M.packMarks(store({}, { 't18:3': 20 })), M.packMarks(store({ 't18:3': mk(18, 30) })));
  assert.ok(m['t18:3'] && !m['t18:3'].deleted);
});
t('local mark newer than its own stale tomb is packed as live', () => {
  const p = M.packMarks(store({ 't18:3': mk(18, 30) }, { 't18:3': 20 }));
  assert.ok(!p['t18:3'].deleted);
});
t('marks merge does not touch review/unf/done/quiz or mine', () => {
  const S = Object.assign(S0(), { unf: { 't18:3': 7 } });
  const p = M.packLocal(S, 10); p.marks = M.packMarks(store({ 't18:3': mk(18, 5) }));
  p.mine = M.packMine(store({ a: { kana: 'ねこ', zh: 'x', t: 1, u: 1 } }));
  const m = M.merge(p, M.emptyPacked());
  const S2 = S0(); M.applyToLocal(S2, m);
  assert.strictEqual(S2.unf['t18:3'], 7);
  assert.ok(!('marks' in S2) && !('items' in S2));
  assert.ok(m.mine.a && m.marks['t18:3']);
});
t('cloud doc without marks (older app) keeps local marks', () => {
  const p = M.packLocal(S0(), 10); p.marks = M.packMarks(store({ 't18:3': mk(18, 5) }));
  const m = M.merge(p, { review: {}, unf: {}, done: {}, quiz: {}, updatedAt: 50 });
  assert.ok(m.marks['t18:3'] && !m.marks['t18:3'].deleted);
});
t('rebase keeps cloud marks (local S has no marks field)', () => {
  const merged = M.merge(M.packLocal(S0(), 1), { marks: { 't18:3': { l: 18, t: 5, updatedAt: 5 } } });
  const r = M.rebase(S0(), merged, 2);
  assert.ok(r.marks['t18:3']);
});
t('marksSig changes only when marks change', () => {
  const s = store({ 't18:3': mk(18, 5) }); const a = M.marksSig(s);
  M.applyMarks(s, M.mergeMarks(M.packMarks(s), M.packMarks(s)));
  assert.strictEqual(M.marksSig(s), a);
  M.applyMarks(s, M.mergeMarks(M.packMarks(s), M.packMarks(store({ 't18:3': mk(18, 9) }))));
  assert.notStrictEqual(M.marksSig(s), a);
});
t('extra fields on cloud entries are not copied into local store', () => {
  const s = M.applyMarks(store(), { 't18:3': { l: 18, t: 5, updatedAt: 5, junk: 1 } });
  assert.deepStrictEqual(s.items['t18:3'], { l: 18, t: 5, u: 5 });
});
console.log(passed + ' tests passed');
