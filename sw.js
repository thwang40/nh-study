const APP_VER = '3.47';   // 要和 app.js APP_VER、version.json、index.html 一致（test_version.js 會檢查）
const SHELL = 'nh-shell-v96', AUDIO = 'nh-audio-v9', PAGES = 'nh-pages-v1';
const SHELL_FILES = ['./','index.html','style.css','app.js','data.js','tango.js','tango-ex.js','mix.js','vforms.js','mine-core.js','mine.js','tags.js','ill.js','sec.js','blk.js','firebase-config.js','sync-merge.js','sync-auth.js','sync.js','auth-callback.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png','icons/maskable-512.png'].concat(["pages/ill2/1-T1_0.webp", "pages/ill2/1-T2_0.webp", "pages/ill2/1-T3_0.webp", "pages/ill2/1-T3_1.webp", "pages/ill2/10-T1_0.webp", "pages/ill2/10-T2_0.webp", "pages/ill2/11-T1_0.webp", "pages/ill2/11-T2_0.webp", "pages/ill2/11-T3_0.webp", "pages/ill2/12-T1_0.webp", "pages/ill2/12-T2_0.webp", "pages/ill2/12-T2_1.webp", "pages/ill2/12-T2_2.webp", "pages/ill2/12-T2_3.webp", "pages/ill2/12-T2_4.webp", "pages/ill2/2-T1_0.webp", "pages/ill2/2-T1_1.webp", "pages/ill2/2-T1_2.webp", "pages/ill2/2-T1_3.webp", "pages/ill2/2-T1_4.webp", "pages/ill2/2-T1_5.webp", "pages/ill2/2-T1_6.webp", "pages/ill2/2-T1_7.webp", "pages/ill2/2-T2_0.webp", "pages/ill2/3-T1_0.webp", "pages/ill2/3-T1_1.webp", "pages/ill2/4-T2_0.webp", "pages/ill2/4-T2_1.webp", "pages/ill2/5-T1_0.webp", "pages/ill2/5-T2_0.webp", "pages/ill2/5-T2_1.webp", "pages/ill2/5-T2_2.webp", "pages/ill2/6-T1_0.webp", "pages/ill2/6-T1_1.webp", "pages/ill2/6-T1_2.webp", "pages/ill2/6-T1_3.webp", "pages/ill2/6-T1_4.webp", "pages/ill2/6-T2_0.webp", "pages/ill2/6-T2_1.webp", "pages/ill2/6-T2_2.webp", "pages/ill2/6-T3_0.webp", "pages/ill2/6-T3_1.webp", "pages/ill2/6-T3_2.webp", "pages/ill2/6-T3_3.webp", "pages/ill2/6-T3_4.webp", "pages/ill2/6-T3_5.webp", "pages/ill2/7-T1_0.webp", "pages/ill2/7-T1_1.webp", "pages/ill2/7-T2_0.webp", "pages/ill2/7-T2_1.webp", "pages/ill2/7-T2_2.webp", "pages/ill2/7-T3_0.webp", "pages/ill2/7-T3_1.webp", "pages/ill2/8-T1_0.webp", "pages/ill2/8-T1_1.webp", "pages/ill2/8-T2_0.webp", "pages/ill2/9-T1_0.webp", "pages/ill2/9-T2_0.webp", "pages/ill2/9-T2_1.webp", "pages/ill2/9-T3_0.webp", "pages/ill2/9-T3_1.webp"]);
self.window = self; importScripts('data.js'); importScripts('tango.js'); importScripts('tango-ex.js'); importScripts('mix.js'); importScripts('vforms.js'); importScripts('mine.js');
const AUDIO_FILES = self.BOOK.dialogues.flatMap(d => d.lines.flatMap((_, i) => [`audio/${d.id}_${i}.mp3`, `audio/${d.id}_${i}_s.mp3`]));
// 逐句聽力練習（長輪次拆句）audio/<id>-s_<k>.mp3
self.BOOK.dialogues.forEach(d => { let k = 0; d.lines.forEach(ln => (ln.parts || []).forEach(() => { AUDIO_FILES.push(`audio/${d.id}-s_${k}.mp3`, `audio/${d.id}-s_${k}_s.mp3`); k++; })); });
// 同文型聽力練習（課本文型例句）的音檔也預先存離線
AUDIO_FILES.push(...Object.entries(self.BOOK.drills || {}).flatMap(([k, items]) => items.flatMap((_, i) => [`audio/g${k}_${i}.mp3`, `audio/g${k}_${i}_s.mp3`])));
// 單字音檔（搜尋「聽力模式」用）audio/w_<n>.mp3，n = Object.keys(BOOK.vocab) 的順序
Object.keys(self.BOOK.vocab || {}).forEach((_, n) => AUDIO_FILES.push(`audio/w_${n}.mp3`, `audio/w_${n}_s.mp3`));
Object.keys(self.BOOK.tango || {}).forEach(n => { (self.BOOK.tango[n].lines || []).forEach((_, i) => AUDIO_FILES.push(`audio/t${n}_${i}.mp3`, `audio/t${n}_${i}_s.mp3`)); });
Object.entries(self.BOOK.tangoEx || {}).forEach(([n, items]) => (items||[]).forEach((_, i) => AUDIO_FILES.push(`audio/t${n}e_${i}.mp3`, `audio/t${n}e_${i}_s.mp3`)));
(self.BOOK.mix || []).forEach((_, i) => AUDIO_FILES.push(`audio/mx_${i}.mp3`, `audio/mx_${i}_s.mp3`));
// 單語頁動詞變化聽力 audio/vf<j>_<k>.mp3
(self.BOOK.vf || []).forEach((v, j) => v.f.forEach((_, k) => AUDIO_FILES.push(`audio/vf${j}_${k}.mp3`, `audio/vf${j}_${k}_s.mp3`)));
// 我的單語（mine.js，bake_mine.py 產生）
Object.entries(self.BOOK.mine || {}).forEach(([id, m]) => { const add = b => AUDIO_FILES.push(b + '.mp3', b + '_s.mp3'); if (m.w) add(`audio/my_${id}_0`); (m.ex || []).forEach((_, k) => add(`audio/mye_${id}_${k}`)); for (let k = 0; k < (m.nf || 0); k++) add(`audio/myf_${id}_${k}`); });
// v3.47 重新產生的音檔（疑問句句尾上揚＋いつ 的聲調；檔名不變）
const REAUDIO_347 = new Set(["g2-5_2", "g2-5_9", "mx_0", "mx_1012", "mx_1022", "mx_1025", "mx_1028", "mx_1034", "mx_1035", "mx_1037", "mx_1039", "mx_104", "mx_1044", "mx_1058", "mx_1070", "mx_1071", "mx_1073", "mx_1074", "mx_1079", "mx_1082", "mx_1084", "mx_1089", "mx_1090", "mx_1096", "mx_1101", "mx_1103", "mx_1107", "mx_1108", "mx_1109", "mx_1110", "mx_1111", "mx_1113", "mx_1116", "mx_1121", "mx_1125", "mx_1126", "mx_1132", "mx_1133", "mx_1137", "mx_1139", "mx_1142", "mx_1145", "mx_1147", "mx_1148", "mx_1149", "mx_1150", "mx_1154", "mx_1155", "mx_117", "mx_12", "mx_124", "mx_129", "mx_13", "mx_134", "mx_136", "mx_138", "mx_140", "mx_145", "mx_147", "mx_153", "mx_159", "mx_16", "mx_169", "mx_17", "mx_174", "mx_18", "mx_199", "mx_2", "mx_200", "mx_202", "mx_207", "mx_208", "mx_21", "mx_22", "mx_228", "mx_231", "mx_234", "mx_236", "mx_238", "mx_239", "mx_24", "mx_243", "mx_244", "mx_249", "mx_25", "mx_251", "mx_254", "mx_259", "mx_262", "mx_267", "mx_27", "mx_270", "mx_271", "mx_272", "mx_273", "mx_274", "mx_275", "mx_281", "mx_291", "mx_296", "mx_298", "mx_299", "mx_30", "mx_301", "mx_304", "mx_308", "mx_310", "mx_313", "mx_324", "mx_328", "mx_329", "mx_330", "mx_331", "mx_334", "mx_336", "mx_338", "mx_34", "mx_344", "mx_348", "mx_350", "mx_351", "mx_353", "mx_356", "mx_36", "mx_373", "mx_374", "mx_381", "mx_384", "mx_39", "mx_395", "mx_40", "mx_406", "mx_41", "mx_415", "mx_416", "mx_419", "mx_42", "mx_423", "mx_435", "mx_440", "mx_441", "mx_45", "mx_452", "mx_455", "mx_457", "mx_460", "mx_465", "mx_467", "mx_468", "mx_47", "mx_474", "mx_475", "mx_48", "mx_487", "mx_494", "mx_495", "mx_496", "mx_498", "mx_501", "mx_503", "mx_504", "mx_507", "mx_51", "mx_510", "mx_513", "mx_519", "mx_523", "mx_524", "mx_528", "mx_529", "mx_53", "mx_530", "mx_531", "mx_533", "mx_534", "mx_535", "mx_536", "mx_537", "mx_539", "mx_540", "mx_541", "mx_553", "mx_559", "mx_563", "mx_566", "mx_567", "mx_568", "mx_569", "mx_571", "mx_572", "mx_573", "mx_574", "mx_575", "mx_58", "mx_581", "mx_584", "mx_588", "mx_592", "mx_597", "mx_60", "mx_600", "mx_601", "mx_602", "mx_603", "mx_604", "mx_605", "mx_606", "mx_607", "mx_608", "mx_610", "mx_611", "mx_612", "mx_613", "mx_622", "mx_63", "mx_630", "mx_632", "mx_638", "mx_639", "mx_64", "mx_640", "mx_641", "mx_642", "mx_643", "mx_644", "mx_645", "mx_647", "mx_648", "mx_649", "mx_65", "mx_655", "mx_657", "mx_659", "mx_664", "mx_667", "mx_668", "mx_669", "mx_674", "mx_675", "mx_677", "mx_678", "mx_679", "mx_681", "mx_682", "mx_683", "mx_684", "mx_690", "mx_699", "mx_7", "mx_703", "mx_708", "mx_710", "mx_711", "mx_712", "mx_713", "mx_715", "mx_717", "mx_719", "mx_72", "mx_720", "mx_721", "mx_73", "mx_747", "mx_749", "mx_757", "mx_76", "mx_766", "mx_77", "mx_771", "mx_776", "mx_782", "mx_783", "mx_784", "mx_785", "mx_788", "mx_79", "mx_790", "mx_791", "mx_793", "mx_795", "mx_800", "mx_801", "mx_802", "mx_81", "mx_811", "mx_814", "mx_815", "mx_818", "mx_819", "mx_82", "mx_821", "mx_823", "mx_826", "mx_828", "mx_829", "mx_844", "mx_849", "mx_85", "mx_854", "mx_857", "mx_859", "mx_86", "mx_860", "mx_87", "mx_872", "mx_890", "mx_891", "mx_893", "mx_894", "mx_898", "mx_899", "mx_9", "mx_929", "mx_930", "mx_940", "mx_95", "mx_951", "mx_952", "mx_960", "mx_962", "mx_963", "mx_964", "mx_965", "mx_968", "mx_97", "mx_972", "mx_973", "t10e_0", "t10e_107", "t10e_110", "t10e_146", "t10e_18", "t10e_20", "t10e_3", "t10e_39", "t10e_55", "t10e_57", "t10e_60", "t10e_61", "t10e_62", "t10e_73", "t11e_102", "t11e_104", "t11e_105", "t11e_107", "t11e_108", "t11e_110", "t11e_112", "t11e_114", "t11e_116", "t11e_128", "t11e_136", "t11e_139", "t11e_14", "t11e_158", "t11e_166", "t11e_180", "t11e_185", "t11e_188", "t11e_19", "t11e_202", "t11e_204", "t11e_210", "t11e_215", "t11e_22", "t11e_233", "t11e_239", "t11e_244", "t11e_41", "t11e_46", "t11e_49", "t11e_6", "t11e_69", "t11e_88", "t11e_96", "t11e_99", "t12e_103", "t12e_11", "t12e_114", "t12e_115", "t12e_118", "t12e_122", "t12e_124", "t12e_125", "t12e_14", "t12e_145", "t12e_153", "t12e_155", "t12e_162", "t12e_17", "t12e_171", "t12e_173", "t12e_18", "t12e_181", "t12e_19", "t12e_20", "t12e_23", "t12e_34", "t12e_43", "t12e_46", "t12e_53", "t12e_57", "t12e_60", "t12e_65", "t12e_71", "t12e_79", "t12e_82", "t12e_91", "t12e_95", "t13e_116", "t13e_118", "t13e_126", "t13e_138", "t13e_141", "t13e_18", "t13e_23", "t13e_24", "t13e_25", "t13e_33", "t13e_34", "t13e_35", "t13e_42", "t13e_43", "t13e_44", "t13e_60", "t13e_91", "t13e_92", "t13e_96", "t13e_97", "t13e_98", "t14e_110", "t14e_119", "t14e_14", "t14e_58", "t14e_81", "t15_8", "t15e_117", "t15e_12", "t15e_13", "t15e_139", "t15e_14", "t15e_15", "t15e_159", "t15e_175", "t15e_189", "t15e_2", "t15e_33", "t15e_39", "t15e_57", "t15e_58", "t15e_59", "t15e_77", "t15e_8", "t15e_83", "t15e_85", "t18_67", "t18e_1", "t18e_102", "t18e_11", "t18e_115", "t18e_120", "t18e_124", "t18e_139", "t18e_143", "t18e_149", "t18e_168", "t18e_177", "t18e_25", "t18e_30", "t18e_52", "t18e_61", "t18e_65", "t18e_67", "t18e_78", "t18e_8", "t18e_90", "t18e_95", "t18e_98", "t18e_99"]);
async function cacheAudio(){
  const c = await caches.open(AUDIO);
  for (let i = 0; i < AUDIO_FILES.length; i += 10) {
    await Promise.allSettled(AUDIO_FILES.slice(i, i + 10).map(async u => { if (!(await c.match(u))) { const r = await fetch(u, {cache: 'no-cache'}); if (r.ok) await c.put(u, r); } }));
  }
}
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL); await c.addAll(SHELL_FILES);
    // v3.43 起：新版裝好後先「等待」，頁面上方顯示「有新版本」，使用者按「更新」才接手（不會在聽到一半時突然重新整理）。
    // 第一次安裝，或是從 v91（3.42）以前的舊版升級（舊頁面沒有提示列）→ 照舊直接接手，舊頁面會自己重新整理一次。
    const olds = (await caches.keys()).map(k => /^nh-shell-v(\d+)$/.exec(k)).filter(m => m && m[0] !== SHELL).map(m => +m[1]);
    if (!olds.length || Math.max(...olds) < 92) await self.skipWaiting();
  })());
});
self.addEventListener('message', e => {
  const m = e.data || {};
  if (m === 'skipWaiting' || m.type === 'skipWaiting') self.skipWaiting();
  else if (m.type === 'ver' && e.ports && e.ports[0]) e.ports[0].postMessage({v: APP_VER, sw: SHELL});
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // v8 -> v9: only new files (逐句 audio/<id>-s_*) were added; carry everything over
    // v7 -> v8: only 本文 audio (audio/<n>-T<m>_*) changed (one file per speaker turn now); carry everything else over
    // (v6 -> v8: drill audio audio/g* changed too)
    for (const [old, changed] of [['nh-audio-v8', /(?!)/], ['nh-audio-v7', /\/\d+-T\d+_/], ['nh-audio-v6', /\/(\d+-T\d+|g\d+-\d+)_/]]) {
      if (!(await caches.has(old))) continue;
      const o = await caches.open(old), n = await caches.open(AUDIO);
      for (const r of await o.keys()) if (!changed.test(new URL(r.url).pathname) && !(await n.match(r))) await n.put(r, await o.match(r));
    }
    // v3.22 one-time purge: only when upgrading from a shell older than v71 (240px 單語插圖); later updates keep the image cache
    const pre322 = (await caches.keys()).some(k => { const m = /^nh-shell-v(\d+)$/.exec(k); return m && +m[1] < 71; });
    // v3.25: 第10課 #21・#29 插圖重畫；從 v74 以前升級時只刪這兩張舊圖
    const pre325 = (await caches.keys()).some(k => { const m = /^nh-shell-v(\d+)$/.exec(k); return m && +m[1] < 74; });
    // v3.47 聲調修正：重新產生的音檔（檔名不變），從 v96 以前升級時只刪這幾個舊檔，cacheAudio() 會重新下載
    const prevShell = Math.max(0, ...(await caches.keys()).map(k => /^nh-shell-v(\d+)$/.exec(k)).filter(m => m && m[0] !== SHELL).map(m => +m[1]));
    if (prevShell && prevShell < 96 && await caches.has(AUDIO)) {
      const ac = await caches.open(AUDIO);
      for (const r of await ac.keys()) { const m = /\/audio\/(.+?)(?:_s)?\.mp3$/.exec(new URL(r.url).pathname); if (m && REAUDIO_347.has(m[1])) await ac.delete(r); }
    }
    for (const k of await caches.keys()) if (![SHELL, AUDIO, PAGES].includes(k)) await caches.delete(k);
    if (pre322 && await caches.has(PAGES)) {
      const pc = await caches.open(PAGES);
      for (const r of await pc.keys()) if (/\/pages\/tango\/img\//.test(new URL(r.url).pathname)) await pc.delete(r);
    }
    if (pre322 && await caches.has(SHELL)) {
      const sc = await caches.open(SHELL);
      for (const r of await sc.keys()) if (/\/pages\/tango\/img\//.test(new URL(r.url).pathname)) await sc.delete(r);
    }
    if (pre325) for (const name of [PAGES, SHELL]) {
      if (!(await caches.has(name))) continue;
      const pc = await caches.open(name);
      for (const r of await pc.keys()) if (/\/pages\/tango\/img\/10-(20|28)\.webp$/.test(new URL(r.url).pathname)) await pc.delete(r);
    }
    await self.clients.claim();
    cacheAudio().catch(() => {});
  })());
});
// iOS Safari asks for media with Range headers; answer with 206 from the cached file
async function rangeResponse(req, res){
  const range = req.headers.get('range');
  if (!range) return res;
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const start = m[1] ? +m[1] : 0, end = m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), {status: 206, statusText: 'Partial Content', headers: {
    'Content-Type': 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes'}});
}
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Never intercept Firebase Auth / Firestore / the official JS SDK (gstatic) or Google accounts.
  // Intercepting these would break sign-in, especially iOS home-screen PWA redirects.
  if (/google(?:apis)?\.com$|gstatic\.com$|firebaseio\.com$|firebaseapp\.com$|googleapis\.com$/.test(url.hostname)) return;
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('/version.json')) return;   // 檢查新版本：一律走網路，不快取
  if (url.pathname.endsWith('.mp3')) {
    e.respondWith((async () => {
      const c = await caches.open(AUDIO);
      const hit = await c.match(url.pathname.replace(/^.*\/audio\//, 'audio/')) || await c.match(e.request);
      if (hit) return rangeResponse(e.request, hit);
      try {
        const full = await fetch(url.pathname, {credentials: 'same-origin', cache: 'no-cache'});
        if (full.ok && full.status === 200) { await c.put(url.pathname.replace(/^.*\/audio\//, 'audio/'), full.clone()); return rangeResponse(e.request, full); }
      } catch (err) {}
      return fetch(e.request);
    })());
    return;
  }
  // textbook page images + section crops: cache on view (not precached)
  if (/\/pages\/(p\d+|(?:sec|blk)\/[^/]+|tango\/(?:img\/)?[^/]+)\.webp$/.test(url.pathname)) {
    e.respondWith((async () => {
      const c = await caches.open(PAGES);
      const key = url.pathname.replace(/^.*\/pages\//, 'pages/');
      const hit = await c.match(key);
      if (hit) return hit;
      try {
        const r = await fetch(e.request);
        if (r.ok && r.status === 200) c.put(key, r.clone());
        return r;
      } catch (err) { return new Response('', {status: 504, statusText: 'offline'}); }
    })());
    return;
  }
  // shell: network-first (revalidated, so a new deploy shows on the next reload); offline or slow (>3 s) → cached copy
  e.respondWith((async () => {
    const c = await caches.open(SHELL);
    const net = fetch(e.request, {cache: 'no-cache'}).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    const hit = await c.match(e.request, {ignoreSearch: true});
    if (!hit) return (await net) || (await c.match('index.html'));
    const r = await Promise.race([net, new Promise(res => setTimeout(() => res(null), 3000))]);
    return (r && r.ok) ? r : hit;
  })());
});
