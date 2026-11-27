#!/usr/bin/env node
'use strict';
// 我的單語（nhStudy.mine）同步合併測試
const assert = require('assert');
const M = require('./sync-merge.js');
let passed = 0;
function t(name, fn) { fn(); passed++; console.log('ok  ' + name); }
const S0 = () => ({ review: {}, unf: {}, done: {}, quiz: {} });
const store = (items, tomb) => ({ items: items || {}, tomb: tomb || {} });
const w = (kana, u, extra) => Object.assign({ ja: '', kana, zh: 'x', t: u, u }, extra || {});

t('docs without mine keep their old shape', () => {
  const m = M.merge(M.packLocal(S0(), 1), M.emptyPacked());
  assert.ok(!('mine' in m));
});
t('first upload: local words reach the cloud intact', () => {
  const p = M.packLocal(S0(), 10); p.mine = M.packMine(store({ a: w('ねこ', 5, { ja: '猫', note: 'n', pos: 'n' }) }));
  const m = M.merge(p, M.emptyPacked());
  assert.deepStrictEqual(m.mine.a, { ja: '猫', kana: 'ねこ', zh: 'x', note: 'n', pos: 'n', t: 5, updatedAt: 5 });
});
t('union of words added on two devices', () => {
  const m = M.mergeMine(M.packMine(store({ a: w('ねこ', 5) })), M.packMine(store({ b: w('いぬ', 6) })));
  const s = M.applyMine(store(), m);
  assert.deepStrictEqual(Object.keys(s.items).sort(), ['a', 'b']);
});
t('same id: newer edit wins', () => {
  const m = M.mergeMine(M.packMine(store({ a: w('ねこ', 5, { zh: 'old' }) })), M.packMine(store({ a: w('ねこ', 9, { zh: 'new' }) })));
  assert.strictEqual(m.a.zh, 'new');
});
t('delete on one device removes it on the other (tombstone newer than item)', () => {
  const m = M.mergeMine(M.packMine(store({}, { a: 20 })), M.packMine(store({ a: w('ねこ', 5) })));
  const s = M.applyMine(store({ a: w('ねこ', 5) }), m);
  assert.ok(!s.items.a); assert.strictEqual(s.tomb.a, 20);
});
t('edit after an older delete brings the word back', () => {
  const m = M.mergeMine(M.packMine(store({}, { a: 20 })), M.packMine(store({ a: w('ねこ', 30) })));
  assert.ok(m.a && !m.a.deleted);
});
t('local item newer than its own stale tomb is packed as live', () => {
  const p = M.packMine(store({ a: w('ねこ', 30) }, { a: 20 }));
  assert.ok(!p.a.deleted);
});
t('mine merge does not touch review/unf/done/quiz', () => {
  const S = Object.assign(S0(), { unf: { 'my_a:0': 7 } });
  const p = M.packLocal(S, 10); p.mine = M.packMine(store({ a: w('ねこ', 5) }));
  const m = M.merge(p, M.emptyPacked());
  const S2 = S0(); M.applyToLocal(S2, m);
  assert.strictEqual(S2.unf['my_a:0'], 7);
  assert.ok(!('mine' in S2) && !('items' in S2));
});
t('cloud doc without mine (old app) keeps local words', () => {
  const p = M.packLocal(S0(), 10); p.mine = M.packMine(store({ a: w('ねこ', 5) }));
  const cloudOld = { review: {}, unf: {}, done: {}, quiz: {}, updatedAt: 50 };
  const m = M.merge(p, cloudOld);
  assert.ok(m.mine.a && !m.mine.a.deleted);
});
t('mineSig changes only when words change', () => {
  const s = store({ a: w('ねこ', 5) }); const a = M.mineSig(s);
  M.applyMine(s, M.mergeMine(M.packMine(s), M.packMine(s)));
  assert.strictEqual(M.mineSig(s), a);
  s.items.b = w('いぬ', 6); assert.notStrictEqual(M.mineSig(s), a);
});
console.log('\n' + passed + ' tests passed');
