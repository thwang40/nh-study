#!/usr/bin/env node
'use strict';
// v3.46 我的單語「整理」：詞性／分類／用途 標籤覆蓋率與解析測試
const assert = require('assert');
global.window = global; global.self = global;
require('./data.js'); require('./tango.js'); require('./tags.js');
const MC = require('./mine-core.js');
const B = global.BOOK, T = B.tags, V = B.vocab, keys = Object.keys(V);
let passed = 0;
function t(name, fn) { fn(); passed++; console.log('ok  ' + name); }
const P = new Set(T.pos.map(x => x[0])), C = new Set(T.cat.map(x => x[0])), U = new Set(T.use.map(x => x[0]));
t('one tag string per BOOK.vocab entry', () => assert.strictEqual(T.v.length, keys.length));
t('every BOOK.vocab entry has a valid 詞性', () => T.v.forEach((s, i) => assert.ok(P.has(MC.parseTag(s).pos), keys[i] + ' ' + s)));
t('every BOOK.vocab entry has at least one 分類 and 用途, all known codes', () => T.v.forEach((s, i) => { const g = MC.parseTag(s);
  assert.ok(g.cat.length && g.use.length, keys[i]); g.cat.forEach(c => assert.ok(C.has(c), keys[i] + ' cat ' + c)); g.use.forEach(u => assert.ok(U.has(u), keys[i] + ' use ' + u)); }));
t('every 單語表 word (L10–18) resolves to tags (via vocab or the tango table)', () => {
  let n = 0;
  Object.entries(B.tango).forEach(([l, X]) => (X.lines || X.words).forEach(w => { n++;
    const it = { ja: MC.strip(w.ja), kana: MC.strip(w.kana) };
    const g = MC.autoTags(T, V, it, w.ja, l);
    assert.ok(g && P.has(g.pos) && g.cat.length && g.use.length, l + ' ' + w.ja); }));
  assert.ok(n > 400);
});
t('ref v: uses the vocab tags', () => { const g = MC.effTags(T, V, { ref: 'v:卒業する', ja: '卒業する', kana: 'そつぎょうする' }); assert.strictEqual(g.pos, 'v3'); assert.ok(g.cat.includes('sc')); });
t('typed word matching BOOK.vocab by kanji or kana gets its tags', () => {
  assert.strictEqual(MC.effTags(T, V, { ja: '食べる', kana: 'たべる' }).pos, 'v2');
  assert.ok(MC.effTags(T, V, { ja: '', kana: 'コーヒー' }).cat.includes('fd'));
});
t('unknown typed word: 詞性 guessed from form, no 分類 (未分類)', () => {
  assert.strictEqual(MC.effTags(T, V, { ja: '散らかす', kana: 'ちらかす' }).pos, 'v1');
  assert.strictEqual(MC.effTags(T, V, { ja: '眺める', kana: 'ながめる' }).pos, 'v2');
  assert.strictEqual(MC.effTags(T, V, { ja: '', kana: 'パソコン' }).pos, 'k');
  assert.strictEqual(MC.effTags(T, V, { ja: '眠い', kana: 'ねむい' }).pos, 'ai');
  assert.strictEqual(MC.effTags(T, V, { ja: '掃除する', kana: 'そうじする' }).pos, 'v3');
  assert.strictEqual(MC.effTags(T, V, { ja: '机', kana: 'つくえ' }).pos, 'n');
  assert.deepStrictEqual(MC.effTags(T, V, { ja: '机', kana: 'つくえ' }).cat, []);
});
t('user edits (it.tg) and chosen 詞性 (it.pos) win over auto tags; empty edit = cleared', () => {
  const g = MC.effTags(T, V, { ref: 'v:卒業する', ja: '卒業する', kana: 'そつぎょうする', pos: 'n', tg: { c: 'hb,fd', u: '' } });
  assert.strictEqual(g.pos, 'n'); assert.deepStrictEqual(g.cat, ['hb', 'fd']); assert.deepStrictEqual(g.use, []);
});
const cnt = k => { const m = {}; T.v.forEach(s => MC.parseTag(s)[k === 'pos' ? 'pos' : k].toString().split(',').forEach(x => { m[x] = (m[x] || 0) + 1; })); return m; };
console.log('coverage: 詞性', JSON.stringify(cnt('pos')));
console.log('\n' + passed + ' tests passed');
