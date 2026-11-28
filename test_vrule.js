// v3.50 動詞變化「怎麼變」說明：每一種形 × 每一類都有規則；依規則算出的假名要和課本資料（vforms.js）一致
global.window = global; require('./vforms.js');
const V = require('./vrule.js'), MC = require('./mine-core.js');
let n = 0, bad = []; const ok = (c, m) => { n++; if (!c) bad.push(m); };
for (const kind of ['godan', 'ichidan', 'suru', 'kuru']) for (const key of V.ORDER) ok(V.RULE[kind][key], `rule ${kind}/${key}`);
for (const kind of ['godan', 'ichidan', 'suru', 'kuru']) ok(V.table(kind).length === 20 && V.table(kind).every(r => r.rule && r.ex), `table ${kind}`);
let forms = 0;
BOOK.vf.forEach((v, j) => {
  const dk = v.f[0][3];
  v.f.forEach(f => { forms++;
    const key = V.keyOf(f[0]); ok(key, `vf${j} label ${f[0]}`); if (!key) return;
    ok(V.predict(dk, v.g, key, v.w) === f[3], `vf${j} ${v.w} ${key}: rule ${V.predict(dk, v.g, key, v.w)} ≠ data ${f[3]}`);
    const e = V.explain(dk, v.g, key, v.w, f[3]); ok(e && e.rule && e.chg && e.chg.stem + e.chg.b === f[3], `vf${j} explain ${key}`);
  });
});
// 例外說明
const irr = (k, g, key, ja) => V.explain(k, g, key, ja).irr;
ok(/ない/.test(irr('ある', 'I', 'nai', 'ある')), 'ある ない 例外');
ok(/行/.test(irr('むかえにいく', 'I', 'te', '迎えに行く')), '行く て 例外');
ok(/敬語/.test(irr('いらっしゃる', 'I', 'masu', 'いらっしゃる')), 'いらっしゃる 例外');
ok(/I 類/.test(irr('はいる', 'I', 'dict', '入る')), '入る 像 II 類');
ok(!irr('かく', 'I', 'te', '書く'), '書く 無例外');
// 我的單語（MineCore）產生的變化也要對得上
[['来る', 'くる', 'III'], ['持って来る', 'もってくる', 'III'], ['話す', 'はなす', 'I'], ['待つ', 'まつ', 'I'], ['死ぬ', 'しぬ', 'I'], ['泳ぐ', 'およぐ', 'I'], ['見る', 'みる', 'II'], ['掃除する', 'そうじする', 'III'], ['行く', 'いく', 'I']].forEach(([ja, k, g]) => {
  MC.conjugate(ja, k, g).forEach(f => { const key = V.keyOf(f[0]); ok(key && V.predict(k, g, key, ja) === f[3], `mine ${ja} ${f[0]} ${V.predict(k, g, key, ja)} ≠ ${f[3]}`); });
});
if (bad.length) { console.log(bad.slice(0, 30).join('\n')); console.log(`${bad.length} FAILED of ${n}`); process.exit(1); }
console.log(`${n} tests passed (${BOOK.vf.length} verbs, ${forms} forms)`);
