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

/* v3.45：從課文句子加入（ref ＋ src 句子清單） */
const sw = (u, srcs, extra) => w('そつぎょうする', u, Object.assign({ ja: '卒業する', ref: 'v:卒業する', src: srcs }, extra || {}));
t('ref and src survive pack → merge → apply', () => {
  const s0 = store({ a: sw(5, { '11-T1:1': { t: 5, u: 5, on: 1 } }) });
  const s = M.applyMine(store(), M.mergeMine(M.packMine(s0), M.emptyPacked().mine || {}));
  assert.strictEqual(s.items.a.ref, 'v:卒業する');
  assert.deepStrictEqual(s.items.a.src, { '11-T1:1': { t: 5, u: 5, on: 1 } });
});
t('sentences added on two devices are unioned (not lost to the newer word)', () => {
  const m = M.mergeMine(M.packMine(store({ a: sw(5, { '11-T1:1': { t: 5, u: 5, on: 1 } }) })),
                        M.packMine(store({ a: sw(9, { 't11e:12': { t: 9, u: 9, on: 1 } }) })));
  assert.deepStrictEqual(Object.keys(m.a.src).sort(), ['11-T1:1', 't11e:12']);
  assert.strictEqual(m.a.updatedAt, 9);
});
t('removing one sentence (on:0, newer) wins over the older live copy', () => {
  const m = M.mergeMine(M.packMine(store({ a: sw(8, { '11-T1:1': { t: 5, u: 8, on: 0 }, 't11e:12': { t: 6, u: 6, on: 1 } }) })),
                        M.packMine(store({ a: sw(6, { '11-T1:1': { t: 5, u: 5, on: 1 }, 't11e:12': { t: 6, u: 6, on: 1 } }) })));
  assert.strictEqual(m.a.src['11-T1:1'].on, 0);
  assert.strictEqual(m.a.src['t11e:12'].on, 1);
});
t('deleting the whole word still beats sentence edits made before the delete', () => {
  const m = M.mergeMine(M.packMine(store({}, { a: 20 })), M.packMine(store({ a: sw(9, { 'x:1': { t: 9, u: 9, on: 1 } }) })));
  assert.ok(m.a.deleted);
});
t('old app copy without src (same time) does not wipe the sentences', () => {
  const oldCopy = M.packMine(store({ a: w('そつぎょうする', 9, { ja: '卒業する', ref: 'v:卒業する' }) }));
  delete oldCopy.a.ref;
  const m = M.mergeMine(oldCopy, M.packMine(store({ a: sw(9, { '11-T1:1': { t: 9, u: 9, on: 1 } }) })));
  assert.ok(m.a.src && m.a.src['11-T1:1'].on === 1);
});
t('mineSig changes when a sentence is added or removed', () => {
  const s = store({ a: sw(5, { '11-T1:1': { t: 5, u: 5, on: 1 } }) }); const a = M.mineSig(s);
  s.items.a.src['11-T1:1'] = { t: 5, u: 7, on: 0 }; assert.notStrictEqual(M.mineSig(s), a);
});
t('typed words (v3.39 shape, no ref/src) pack exactly as before', () => {
  const p = M.packMine(store({ a: w('ねこ', 5, { ja: '猫' }) }));
  assert.deepStrictEqual(p.a, { ja: '猫', kana: 'ねこ', zh: 'x', t: 5, updatedAt: 5 });
});

/* v3.46：使用者改的 分類／用途（tg） */
t('tg survives pack → merge → apply', () => {
  const s = M.applyMine(store(), M.mergeMine(M.packMine(store({ a: w('つくえ', 5, { tg: { c: 'hm', u: 'dl', t: 5 } }) })), {}));
  assert.deepStrictEqual(s.items.a.tg, { c: 'hm', u: 'dl', t: 5 });
});
t('old app copy without tg (even newer) does not wipe the user tags', () => {
  const m = M.mergeMine(M.packMine(store({ a: w('つくえ', 9, { zh: 'desk' }) })), M.packMine(store({ a: w('つくえ', 5, { tg: { c: 'hm', u: 'dl', t: 5 } }) })));
  assert.strictEqual(m.a.zh, 'desk'); assert.deepStrictEqual(m.a.tg, { c: 'hm', u: 'dl', t: 5 });
});
t('newer tag edit wins; clearing is kept as an empty edit', () => {
  const m = M.mergeMine(M.packMine(store({ a: w('つくえ', 5, { tg: { c: 'hm', u: 'dl', t: 5 } }) })), M.packMine(store({ a: w('つくえ', 7, { tg: { c: '', u: '', t: 7 } }) })));
  assert.deepStrictEqual(m.a.tg, { c: '', u: '', t: 7 });
});
t('mineSig changes when tags change', () => {
  const s = store({ a: w('つくえ', 5, { tg: { c: 'hm', u: '', t: 5 } }) }); const a = M.mineSig(s);
  s.items.a.tg = { c: 'hm,sc', u: '', t: 6 }; assert.notStrictEqual(M.mineSig(s), a);
});
console.log('\n' + passed + ' tests passed');
