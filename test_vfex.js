// v3.51 🗣 造句：可能形以後的每一種形（可能・ば・命令・禁止・受身・使役・使役受身）每個動詞都有一句，句子裡用到那個形，音檔存在
global.window = global; require('./vforms.js'); require('./vfex.js');
const fs = require('fs'), V = require('./vrule.js');
const WANT = ['pot', 'ba', 'imp', 'proh', 'passive', 'caus', 'causpass'];
let n = 0, bad = [], cnt = 0; const ok = (c, m) => { n++; if (!c) bad.push(m); };
const plain = f => f.replace(/《[^》]*》|[【】]/g, '');
BOOK.vf.forEach((v, j) => v.f.forEach((f, k) => {
  const key = V.keyOf(f[0]); if (!WANT.includes(key)) return;
  const x = (BOOK.vfx[j] || {})[k]; ok(x, `vf${j} ${v.w} ${key}: 沒有造句`); if (!x) return; cnt++;
  const [furi, kana, zh] = x, m = furi.match(/【(.*?)】/), t = m && plain(m[1]), fj = f[2];
  ok(t && (t === fj || (/る$/.test(fj) && (t.startsWith(fj.slice(0, -1)) || t.startsWith(fj.slice(0, -1).replace('をでき', 'ができ'))))), `vf${j} ${key}: 【${t}】 ≠ ${fj}`);
  ok(!/[一-龯々]/.test(kana) && kana.length > 4, `vf${j} ${key}: 假名 ${kana}`);
  ok(zh && /[\u4e00-\u9fff]/.test(zh), `vf${j} ${key}: 中文`);
  ok(!/[？?]$/.test(plain(furi)), `vf${j} ${key}: 疑問句要另外處理語調`);
  // 振り仮名裡每個漢字都有讀音
  ok(!/[一-龯々]/.test(furi.replace(/[0-9０-９]*[一-龯々〆ヵヶ]+[0-9０-９]*《[^》]*》/g, '')), `vf${j} ${key}: 漢字沒有讀音`);
  // 假名＝把振り仮名換成讀音
  ok(furi.replace(/[0-9０-９]*[一-龯々〆ヵヶ]+[0-9０-９]*《([^》]*)》/g, '$1').replace(/[【】]/g, '') === kana, `vf${j} ${key}: 假名對不上`);
  for (const s of ['', '_s']) { const p = `audio/vfx${j}_${k}${s}.mp3`; ok(fs.existsSync(p) && fs.statSync(p).size > 2000, `缺音檔 ${p}`); }
}));
// 沒有多出來的（每一句都對得到變化形）
Object.entries(BOOK.vfx).forEach(([j, m]) => Object.keys(m).forEach(k => ok(BOOK.vf[j] && BOOK.vf[j].f[k] && WANT.includes(V.keyOf(BOOK.vf[j].f[k][0])), `多出來的 vfx${j}_${k}`)));
// sw.js 有把造句音檔放進離線清單
const sw = fs.readFileSync('sw.js', 'utf8'); ok(/importScripts\('vfex\.js'\)/.test(sw) && /audio\/vfx\$\{j\}_\$\{k\}\.mp3/.test(sw) && /'vfex\.js'/.test(sw), 'sw.js 離線清單');
ok(/AUDIO = 'nh-audio-v9'/.test(sw), '音檔快取仍是 nh-audio-v9');
if (bad.length) { console.log(bad.slice(0, 30).join('\n')); console.log(`${bad.length} FAILED of ${n}`); process.exit(1); }
console.log(`${n} tests passed (${cnt} 造句)`);
