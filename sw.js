const SHELL = 'nh-shell-v27', AUDIO = 'nh-audio-v8', PAGES = 'nh-pages-v1';
const SHELL_FILES = ['./','index.html','style.css','app.js','data.js','ill.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png','icons/maskable-512.png'].concat(["pages/ill2/1-T1_0.webp", "pages/ill2/1-T2_0.webp", "pages/ill2/1-T3_0.webp", "pages/ill2/1-T3_1.webp", "pages/ill2/10-T1_0.webp", "pages/ill2/10-T2_0.webp", "pages/ill2/11-T1_0.webp", "pages/ill2/11-T2_0.webp", "pages/ill2/11-T3_0.webp", "pages/ill2/12-T1_0.webp", "pages/ill2/12-T2_0.webp", "pages/ill2/12-T2_1.webp", "pages/ill2/12-T2_2.webp", "pages/ill2/12-T2_3.webp", "pages/ill2/12-T2_4.webp", "pages/ill2/2-T1_0.webp", "pages/ill2/2-T1_1.webp", "pages/ill2/2-T1_2.webp", "pages/ill2/2-T1_3.webp", "pages/ill2/2-T1_4.webp", "pages/ill2/2-T1_5.webp", "pages/ill2/2-T1_6.webp", "pages/ill2/2-T1_7.webp", "pages/ill2/2-T2_0.webp", "pages/ill2/3-T1_0.webp", "pages/ill2/3-T1_1.webp", "pages/ill2/4-T2_0.webp", "pages/ill2/4-T2_1.webp", "pages/ill2/5-T1_0.webp", "pages/ill2/5-T2_0.webp", "pages/ill2/5-T2_1.webp", "pages/ill2/5-T2_2.webp", "pages/ill2/6-T1_0.webp", "pages/ill2/6-T1_1.webp", "pages/ill2/6-T1_2.webp", "pages/ill2/6-T1_3.webp", "pages/ill2/6-T1_4.webp", "pages/ill2/6-T2_0.webp", "pages/ill2/6-T2_1.webp", "pages/ill2/6-T2_2.webp", "pages/ill2/6-T3_0.webp", "pages/ill2/6-T3_1.webp", "pages/ill2/6-T3_2.webp", "pages/ill2/6-T3_3.webp", "pages/ill2/6-T3_4.webp", "pages/ill2/6-T3_5.webp", "pages/ill2/7-T1_0.webp", "pages/ill2/7-T1_1.webp", "pages/ill2/7-T2_0.webp", "pages/ill2/7-T2_1.webp", "pages/ill2/7-T2_2.webp", "pages/ill2/7-T3_0.webp", "pages/ill2/7-T3_1.webp", "pages/ill2/8-T1_0.webp", "pages/ill2/8-T1_1.webp", "pages/ill2/8-T2_0.webp", "pages/ill2/9-T1_0.webp", "pages/ill2/9-T2_0.webp", "pages/ill2/9-T2_1.webp", "pages/ill2/9-T3_0.webp", "pages/ill2/9-T3_1.webp"]);
self.window = self; importScripts('data.js');
const AUDIO_FILES = self.BOOK.dialogues.flatMap(d => d.lines.flatMap((_, i) => [`audio/${d.id}_${i}.mp3`, `audio/${d.id}_${i}_s.mp3`]));
// 同文型聽力練習（課本文型例句）的音檔也預先存離線
AUDIO_FILES.push(...Object.entries(self.BOOK.drills || {}).flatMap(([k, items]) => items.flatMap((_, i) => [`audio/g${k}_${i}.mp3`, `audio/g${k}_${i}_s.mp3`])));
async function cacheAudio(){
  const c = await caches.open(AUDIO);
  for (let i = 0; i < AUDIO_FILES.length; i += 10) {
    await Promise.allSettled(AUDIO_FILES.slice(i, i + 10).map(async u => { if (!(await c.match(u))) { const r = await fetch(u, {cache: 'no-cache'}); if (r.ok) await c.put(u, r); } }));
  }
}
self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // v7 -> v8: only 本文 audio (audio/<n>-T<m>_*) changed (one file per speaker turn now); carry everything else over
    // (v6 -> v8: drill audio audio/g* changed too)
    for (const [old, changed] of [['nh-audio-v7', /\/\d+-T\d+_/], ['nh-audio-v6', /\/(\d+-T\d+|g\d+-\d+)_/]]) {
      if (!(await caches.has(old))) continue;
      const o = await caches.open(old), n = await caches.open(AUDIO);
      for (const r of await o.keys()) if (!changed.test(new URL(r.url).pathname) && !(await n.match(r))) await n.put(r, await o.match(r));
    }
    for (const k of await caches.keys()) if (![SHELL, AUDIO, PAGES].includes(k)) await caches.delete(k);
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
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
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
  // textbook page images: cache on view (not precached)
  if (/\/pages\/p\d+\.webp$/.test(url.pathname)) {
    e.respondWith((async () => {
      const c = await caches.open(PAGES);
      const key = url.pathname.replace(/^.*\/pages\//, 'pages/');
      const hit = await c.match(key);
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r.ok) c.put(key, r.clone());
      return r;
    })());
    return;
  }
  // shell: stale-while-revalidate
  e.respondWith((async () => {
    const c = await caches.open(SHELL);
    const hit = await c.match(e.request, {ignoreSearch: true});
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    return hit || (await net) || (await c.match('index.html'));
  })());
});
