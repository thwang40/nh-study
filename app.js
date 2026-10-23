(function(){
'use strict';
const B = window.BOOK;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS_KEY = 'bunkaListen.v2'; // v2：內容改為依使用者課本 PDF 重建，舊進度不沿用
const S = Object.assign({speed:1, engine:'mp3', listenFirst:true, showKana:true, done:{}, quiz:{}, review:{}, unf:{}}, safeParse(localStorage.getItem(LS_KEY)));
function safeParse(t){ try{ return JSON.parse(t)||{}; }catch(e){ return {}; } }
// 聽力優先 is always the default: the 聽力優先／顯示全文 toggle only applies to the page you are on and is never stored.
// (Older versions saved listenFirst:false in localStorage, which made every page open with the text shown.)
S.listenFirst = true;
function save(){ try{ const o = Object.assign({}, S); delete o.listenFirst; localStorage.setItem(LS_KEY, JSON.stringify(o)); }catch(e){} updateChips(); }
try{ if(JSON.parse(localStorage.getItem(LS_KEY)||'{}').listenFirst !== undefined) save(); }catch(e){}
// 本文改為「一張卡片＝課本一個說話輪次」(turns v1)：複習清單裡舊的逐句編號換成新卡片編號
if(!S.turns){ try{ const R = {}; Object.entries(S.review).forEach(([k, v]) => { const [id, i] = k.split(':'); const d = B.dialogues.find(x => x.id===id);
    const nk = d && d.remap ? `${id}:${d.remap[+i]}` : k; if(d && d.remap && d.remap[+i]==null) return;
    if(R[nk]){ R[nk].n = (R[nk].n||0) + (v.n||0); R[nk].t = Math.max(R[nk].t||0, v.t||0); } else R[nk] = v; });
  S.review = R; }catch(e){} S.turns = 1; save(); }
if(!S.unf || typeof S.unf!=='object') S.unf = {};
const DLG = {}; B.dialogues.forEach(d => DLG[d.id] = d);
// 逐句聽力練習：同一個人一次說超過 3 句的輪次（data: ln.parts）→ 虛擬對話 <id>-s（一句一張卡片，音檔 audio/<id>-s_<k>.mp3）
const SPLITD = {};
B.dialogues.forEach(d => { const lines = [], groups = [];
  d.lines.forEach((ln, ti) => { if(!ln.parts || !ln.parts.length) return; const g = {ti, idx:[]};
    ln.parts.forEach((p, j) => { g.idx.push(lines.length); lines.push({s:ln.s, ja:p.ja, kana:p.kana, zh:p.zh, g:p.g||[], v:p.v||[], part:[ti, j], lab:`${lineNo(d, ti).lab}之${j+1}`}); });
    groups.push(g); });
  if(!lines.length) return;
  const v = {id:d.id+'-s', l:d.l, title:d.title, scene:d.scene, sp:d.sp, src:d.src, split:d.id, lines, groups};
  SPLITD[d.id] = v; DLG[v.id] = v; });
/* 還不熟悉 checkbox: S.unf[key] = timestamp */
function ufHTML(key, scene){ if(scene) return ''; const on = !!S.unf[key]; return `<label class="ufam" title="還不熟悉"><input type="checkbox" data-uf="${key}" aria-label="標記為還不熟悉"${on?' checked':''}></label>`; }
function revCount(){ return new Set(Object.keys(S.review).concat(Object.keys(S.unf||{}))).size; }
function revKeys(){ const ok = k => { const [id,i] = k.split(':'); return DLG[id] && DLG[id].lines[+i]; };
  return { unf: Object.keys(S.unf).filter(ok).sort((a,b)=>S.unf[b]-S.unf[a]), rev: Object.keys(S.review).filter(ok).sort((a,b)=>S.review[b].t-S.review[a].t) }; }
const LESSON = {}; B.lessons.forEach(l => LESSON[l.n] = l);
// 同文型聽力練習：每個文型一組例句，當成「虛擬對話」放進 DLG，播放／顯示／測驗／複習共用同一套機制
const DRILL = {};
Object.entries(B.drills||{}).forEach(([k, items]) => { const g = B.grammar[k]; if(!g) return;
  const d = {id:'g'+k, l:g.l, drill:k, title:'同文型練習「'+g.p+'」', scene:g.zh,
    sp:{A:{name:'女',voice:'f'}, B:{name:'男',voice:'m'}},
    lines: items.map(it => ({s: it.v[0]==='m'?'B':'A', ja:it.ja, kana:it.kana, zh:it.zh, g:[k], v:[], x:it.x||null, pg:it.pg, tag:it.tag}))};
  DRILL[k] = d; DLG[d.id] = d; });
// 課本頁序：每課依課本頁面順序交錯排列「本文」與「文型」，同一頁先出現者在前；實用會話（自編）放最後
const GFIRST = {'1-3':1, '7-5':1}; // 這兩頁課本是「文型」印在「本文」上面（p.26、p.93）
function flowOf(n){
  const it = [];
  B.dialogues.filter(d=>d.l===n && d.src).forEach(d => it.push({d, pg:d.src.page, w:1}));
  Object.keys(DRILL).filter(k=>DRILL[k].l===n).forEach(k => it.push({d:DRILL[k], pg:B.grammar[k].pg, w:GFIRST[k]?0:2}));
  it.forEach((x,i)=>x.i=i); it.sort((a,b)=>a.pg-b.pg || a.w-b.w || a.i-b.i);
  return it.map(x=>x.d).concat(B.dialogues.filter(d=>d.l===n && !d.src));
}
const FLOW = {}; for(let n=0; n<=12; n++) FLOW[n] = flowOf(n);
const FLOW_ALL = [].concat(...Object.keys(FLOW).sort((a,b)=>a-b).map(n=>FLOW[n]));
const flowNav = d => { const p = FLOW_ALL.indexOf(d); return {prev: FLOW_ALL[p-1], next: FLOW_ALL[p+1]}; };
const flowName = d => d.drill ? gLabel(d.drill) : d.src ? `第${d.l}課 ${d.src.label}「${d.title}」` : `實用會話 ${d.id}「${d.title}」`;
function flowNavHTML(d){ const {prev, next} = flowNav(d); const href = x => x.drill ? `#/g/${x.drill}` : `#/d/${x.id}`;
  return `<div class="row" style="margin-top:8px">${prev?`<a class="btn ghost" style="text-decoration:none" href="${href(prev)}" title="${esc(flowName(prev))}">‹ 上一項</a>`:''}${next?`<a class="btn ghost" style="text-decoration:none" href="${href(next)}" title="${esc(flowName(next))}">下一項 ›</a>`:''}</div>${next?`<div class="small mute">下一項：${esc(flowName(next))}</div>`:''}`; }
const UNCERTAIN = {};
const isText = d => !!d.src;
const srcTag = d => d.src ? `課本原文・${d.src.label}・p.${d.src.page}` : '實用會話（自編）';

/* ---------------- audio ---------------- */
const audio = new Audio(); audio.preload = 'auto';
let jaVoice = null, ttsReady = false, playToken = 0, curPlaying = null;
function loadVoices(){
  if(!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices();
  const ja = vs.filter(v => /^ja(-|_|$)/i.test(v.lang));
  jaVoice = ja.find(v=>/Kyoko|Otoya|Nanami|Google/i.test(v.name)) || ja[0] || null;
  ttsReady = vs.length > 0;
}
if('speechSynthesis' in window){ loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
let unlocked = false;
function unlock(){
  if(unlocked) return; unlocked = true;
  // iOS: prime speech synthesis + audio element within a user gesture
  try{ if('speechSynthesis' in window){ const u = new SpeechSynthesisUtterance(''); u.volume=0; speechSynthesis.speak(u); } }catch(e){}
}
document.addEventListener('touchend', unlock, {passive:true}); document.addEventListener('click', unlock);

function stopAll(){
  playToken++;
  try{ audio.pause(); }catch(e){}
  audio.onended = audio.onerror = null;
  if('speechSynthesis' in window) try{ speechSynthesis.cancel(); }catch(e){}
  setPlaying(null);
}
function setPlaying(key){
  curPlaying = key;
  document.querySelectorAll('.line.playing,.dline.playing').forEach(e=>e.classList.remove('playing'));
  document.querySelectorAll('[data-act="dall"]').forEach(b => b.textContent = key && key.startsWith(b.dataset.d+':') ? '⏹ 停止' : '▶ 全部播放');
  if(key){ const el = document.querySelector(`.line[data-key="${key}"]`) || document.querySelector(`.dline[data-key="${key}"]`); if(el){ el.classList.add('playing'); if(el.getBoundingClientRect().top > innerHeight-120 || el.getBoundingClientRect().top < 100) el.scrollIntoView({block:'center', behavior:'smooth'}); } }
  const pb = $('#playAllBtn'); if(pb) pb.textContent = key ? '⏹ 停止' : '▶ 全部播放';
  const np = $('#nowPlaying'); if(np){ const [id,i] = (key||'').split(':'); const d = DLG[id]; np.textContent = d ? `▶ ${d.drill ? (d.l ? `第${d.l}課・文型${d.drill.split('-')[1]} p.${B.grammar[d.drill].pg}` : `入門・${B.grammar[d.drill].p} p.${B.grammar[d.drill].pg}`) : d.src ? `第${d.l}課 ${d.src.label} p.${d.src.page}` : `實用會話 ${d.id}`}・${lineNo(d,+i).lab}` : ''; } // no Japanese text here: listening first
}
function speakTTS(text, token){
  return new Promise(res => {
    if(!('speechSynthesis' in window)){ toast('此裝置不支援語音'); return res(); }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP'; if(jaVoice) u.voice = jaVoice; u.rate = S.speed < 1 ? 0.7 : 0.95;
    let done = false; const fin = () => { if(!done){ done = true; res(); } };
    u.onend = fin; u.onerror = fin;
    speechSynthesis.speak(u);
    // safety: some Android builds never fire onend
    setTimeout(fin, 1500 + text.length * 450 / (S.speed<1?0.7:1));
  });
}
function playMP3(src, token){
  return new Promise((res, rej) => {
    audio.onended = () => res();
    audio.onerror = () => rej(new Error('audio error'));
    audio.src = src; audio.playbackRate = 1;
    const p = audio.play();
    if(p && p.catch) p.catch(rej);
  });
}
async function playLine(d, i, token){
  if(token === undefined){ stopAll(); token = playToken; }
  const key = d.id + ':' + i; setPlaying(key);
  const ln = d.lines[i];
  if(S.engine === 'mp3'){
    try{ await playMP3(`audio/${d.id}_${i}${S.speed<1?'_s':''}.mp3`, token); }
    catch(e){ if(token !== playToken) return false; toast('MP3 載入失敗，改用裝置語音'); await speakTTS(ln.ja, token); }
  } else { await speakTTS(ln.ja, token); }
  if(token !== playToken) return false;
  setPlaying(null); return true;
}
const wait = ms => new Promise(r=>setTimeout(r, ms));
async function playSeq(d, idxs, gap=700, repeat=1){
  stopAll(); const token = playToken;
  for(const i of idxs){ for(let r=0;r<repeat;r++){
    if(token!==playToken) return false;
    const ok = await playLine(d, i, token); if(!ok) return false;
    await wait(repeat>1 ? 900 : gap);
  }}
  if(token===playToken) setPlaying(null);
  return token===playToken;
}

/* ---------------- helpers ---------------- */
function lessonLabel(l){ return l===0 ? '入門' : `第${l}課`; }
function gLabel(key){
  const g = B.grammar[key]; if(!g) return key;
  const [l,n] = key.split('-');
  return (l==='0' ? `入門・${g.p}` : `第${l}課・文型${n} ${g.t||g.p}`) + (g.pg ? ` p.${g.pg}` : '');
}
function vLabel(w){ const v = B.vocab[w]; if(!v) return ''; return v.l==='補' ? '補充單字' : lessonLabel(v.l); }
function drillSrcHTML(d, i){
  const ln = d.lines[i], k = d.drill, g = B.grammar[k];
  let h = `<div class="src"><div>📖 <b>出處</b>：《${esc(B.title)}》${esc(gLabel(k))}</div>`;
  h += `<div style="margin-top:4px"><span class="tag txt">課本原文</span> ${esc(gLabel(k).replace(/ p\.\d+$/,''))}・<b>p.${ln.pg||g.pg}</b>${lineNo(d,i).pre?`・${esc(lineNo(d,i).pre)}`:''}・${esc(lineNo(d,i).lab)}</div>`;
  h += `<div style="margin:4px 0"><div class="small">${esc(g.zh)}</div></div>`;
  if(ln.x && ln.x.length) h += `<div class="srch"><b>補充單字</b></div><div class="vocab">${ln.x.map(e=>`<span>${esc(e.w)}（${esc(e.r)}）＝${esc(e.zh)} <em>補充單字</em></span>`).join('')}</div>`;
  return h + `<div class="row" style="margin-top:8px"><a class="btn sm ghost" style="text-decoration:none" href="#/g/${k}">🎧 這個文型的全部練習 ›</a></div></div>`;
}
function drillLineHTML(d, i){
  return `<div class="dline" data-key="${d.id}:${i}" data-d="${d.id}" data-i="${i}" data-lv="0"><button class="ibtn" data-act="play" data-d="${d.id}" data-i="${i}" aria-label="播放這句">🔊</button><div class="dtext">${drillTextHTML(d, i, 0)}</div></div>`;
}
function drillTextHTML(d, i, lv){
  const ln = d.lines[i];
  if(lv<1) return `<button class="hiddenText" data-act="drv">👂 先聽聽看… 點這裡顯示日文</button>`;
  let h = `<div class="small mute">p.${ln.pg} ${esc(ln.tag||'')}</div><div class="ja">${esc(ln.ja)}</div>${S.showKana?`<div class="kana">${esc(ln.kana)}</div>`:''}`;
  if(lv<2) return h + `<button class="btn sm ghost" data-act="drv">顯示中文</button>`;
  h += `<div class="zh">${esc(ln.zh)}</div>`;
  if(ln.x && ln.x.length) h += `<div class="small mute">補充單字：${ln.x.map(e=>esc(e.w+'（'+e.r+'）＝'+e.zh)).join('、')}</div>`;
  return h + `<button class="btn sm ghost" data-act="drv">隱藏</button>`;
}
function speedSegHTML(){ return `<div class="seg" role="group" aria-label="速度"><button data-act="spd" data-sp="0.7" class="${S.speed<1?'on':''}">0.7x</button><button data-act="spd" data-sp="1" class="${S.speed>=1?'on':''}">1x</button></div>`; }
function drillsHTML(keys, skip){
  keys = keys.filter(k => DRILL[k] && k !== skip); if(!keys.length) return '';
  return `<div class="drills"><div style="margin-top:10px"><b>🎧 同文型聽力練習</b> <span class="small mute">課本文型例句（標頁碼），先聽，再點開日文、中文</span></div>` + keys.map((k, n) => { const d = DRILL[k];
    return `<details class="drill" ${n===0?'open':''}><summary>${esc(gLabel(k))}（${d.lines.length} 句）</summary>
    <div class="row drillbar"><button class="btn sm" data-act="dall" data-d="${d.id}">▶ 全部播放</button>${speedSegHTML()}<a class="btn sm ghost" style="text-decoration:none" href="#/q/${d.id}">✏️ 小測驗</a><a class="btn sm ghost" style="text-decoration:none" href="#/g/${k}">全頁 ›</a></div>
    <div class="dlines">${d.lines.map((_, i) => drillLineHTML(d, i)).join('')}</div></details>`; }).join('') + `</div>`;
}
function srcHTML(d, i){
  if(d.drill) return drillSrcHTML(d, i);
  const ln = d.lines[i]; const L = LESSON[d.l];
  let h = `<div class="src"><div>📖 <b>出處</b>：《${esc(B.title)}》第${d.l}課「${esc(L.t)}」（${esc(L.zh)}）</div>`;
  h += d.src ? `<div style="margin-top:4px"><span class="tag txt">課本原文</span> 第${d.l}課・${esc(d.src.label)}「${esc(d.title)}」<b>p.${d.src.page}</b>・${lineNo(d,i).lab}</div>`
             : `<div style="margin-top:4px"><span class="tag">實用會話</span> 依第${d.l}課（及之前）文型自編・對話 ${esc(d.id)} ${lineNo(d,i).lab}</div>`;
  if(ln.g.length){
    h += `<div class="srch"><b>文型</b></div>`;
    ln.g.forEach(k => { const g = B.grammar[k]; if(!g) return;
      h += `<div class="gent"><span class="tag">${esc(gLabel(k))}</span><div class="small">${esc(g.zh)}</div><div class="small ex">課本例句（p.${g.pg}）：${esc(g.ex)}</div></div>`; });
  }
  if(ln.v.length){
    h += `<div class="srch"><b>單字</b></div><div class="vocab">` + ln.v.map(w => { const v = B.vocab[w]; if(!v) return '';
      return `<span>${esc(w)}${v.r!==w?`（${esc(v.r)}）`:''}＝${esc(v.zh)} <em>${esc(vLabel(w))}</em></span>`; }).join('') + `</div>`;
  }
  if(ln.note) h += `<div class="small srtip">💡 ${esc(ln.note)}</div>`;
  h += drillsHTML(ln.g);
  return h + `</div>`;
}
function srcPanelHTML(d, i){
  const k = d.id+':'+i;
  return `<div class="srcwrap"><button class="srcx top" data-act="srcclose" data-k="${k}" aria-label="收起出處">收起 ▲</button>${srcHTML(d, i)}<button class="srcx bot" data-act="srcclose" data-k="${k}" aria-label="收起出處">收起 ▲</button></div>`;
}
function setIdk(el, open){ if(!el) return; el.classList.toggle('srcopen', open); el.querySelectorAll('[data-act="idk"]').forEach(x=>{ x.setAttribute('aria-expanded', open?'true':'false'); x.classList.toggle('on', open); x.title = open ? '收起出處' : '我不會'; }); }
function lineEl(k){ return document.querySelector(`.line[data-key="${k}"]`); }
/* panel next to per-sentence pictures: widen it under the picture column once it starts below the picture */
function fitSrc(){
  document.querySelectorAll('.igrows > .srcbox').forEach(sb => {
    sb.classList.remove('wide'); if(!sb.innerHTML.trim()) return;
    const g = sb.closest('.igrp'); if(!g || getComputedStyle(g).display!=='grid') return;
    const imgs = g.querySelectorAll('.igimg img'); let bottom = 0; imgs.forEach(im => bottom = Math.max(bottom, im.getBoundingClientRect().bottom));
    if(!imgs.length || sb.getBoundingClientRect().top >= bottom + 4) sb.classList.add('wide');
  });
}
window.addEventListener('resize', () => { clearTimeout(fitSrc._t); fitSrc._t = setTimeout(fitSrc, 150); });
function openSrc(d, i){
  const k = d.id+':'+i, sb = document.getElementById('src-'+k.replace(':','_')); if(!sb) return;
  sb.innerHTML = srcPanelHTML(d, i);
  fitSrc();
  const w = sb.querySelector('.srcwrap'); if(w && w.offsetHeight > 260) w.classList.add('long');
  setIdk(lineEl(k), true);
}
function closeSrc(k, fromBottom){
  const sb = document.getElementById('src-'+k.replace(':','_')); if(!sb) return;
  const el = lineEl(k); sb.innerHTML = ''; setIdk(el, false); fitSrc();
  if(fromBottom && el){ const r = el.getBoundingClientRect(); if(r.top < 60) window.scrollBy(0, r.top - 80); }
}
function addReview(d, i, why){
  const k = d.id + ':' + i; const r = S.review[k] || {n:0};
  r.n++; r.t = Date.now(); r.why = why; S.review[k] = r; save();
}
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toast._t); toast._t = setTimeout(()=>t.classList.add('hidden'), 1800); }
function updateChips(){
  $('#reviewCount').textContent = revCount();
  $('#speedBtn').textContent = (S.speed<1?'0.7':'1.0') + 'x';
  $('#speedBtn').classList.toggle('on', S.speed<1);
}
function lessonProgress(n){
  const ds = n===0 ? FLOW[0] : B.dialogues.filter(d=>d.l===n); const done = ds.filter(d=>S.done[d.id]).length;
  return {done, total: ds.length, pct: Math.round(done/ds.length*100)};
}
function shuffle(a){ a = a.slice(); for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

/* ---------------- side nav ---------------- */
function renderSide(cur){
  $('#side').innerHTML = `<a href="#/" class="${cur==='home'?'cur':''}">🏠 首頁</a><a href="#/review" class="${cur==='review'?'cur':''}">📝 複習清單（${revCount()}）</a><a href="#/p/b/0" class="${cur==='book'?'cur':''}">📚 整本課本（全部頁面）</a>` +
    B.lessons.map(l => { const p = lessonProgress(l.n); return `<a href="#/l/${l.n}" class="${cur===l.n?'cur':''}">${l.n?`第${l.n}課 `:''}${esc(l.t)}<small>${esc(l.zh)}・${p.done}/${p.total} 完成</small></a>`; }).join('');
}

/* ---------------- views ---------------- */
function viewHome(){
  renderSide('home');
  const totalD = B.dialogues.length, doneD = B.dialogues.filter(d=>S.done[d.id]).length;
  $('#view').innerHTML = `
  <h1>文化日本語 第1～12課 聽力練習</h1>
  <p class="mute small">教材：《${esc(B.title)}》（文化外國語專門學校 編）。每課依課本頁序收錄「本文」原文與「文型」例句（皆標頁碼），最後是 2 段實用小對話，先「只聽不看」，再點開日文、中文。聽不懂就按「我不會」，會告訴你出自第幾課、哪個文型、課本第幾頁。每課也可以翻閱課本頁面複習。</p>
  <div class="row" style="margin:8px 0 14px">
    <a class="btn" href="#/l/0" style="text-decoration:none">從入門開始</a><a class="btn ghost" href="#/l/1" style="text-decoration:none">第1課</a>
    <a class="btn alt" href="#/review" style="text-decoration:none">📝 複習清單（${revCount()}）</a>
    <span class="small mute">已完成對話 ${doneD}/${totalD}</span>
  </div>
  <div class="small" style="margin:-6px 0 12px"><a href="#/p/b/0" style="color:inherit">📚 翻閱整本課本（全部 272 頁・含第13–18課與附錄）›</a></div>
  <div class="grid">${B.lessons.map(l => { const p = lessonProgress(l.n); const q = B.dialogues.filter(d=>d.l===l.n).map(d=>S.quiz[d.id]).filter(x=>x!=null);
    return `<a class="card" href="#/l/${l.n}"><div class="lnum">${lessonLabel(l.n)} ${UNCERTAIN[l.n]?'<span class="badge u">部分推定</span>':''}</div><div class="ltitle">${esc(l.t)}</div><div class="small mute">${esc(l.zh)}</div><div class="small mute">${esc(l.topic)}</div>
    <div class="bar"><i style="width:${p.pct}%"></i></div><div class="small mute" style="margin-top:4px">${p.done}/${p.total} 對話${q.length?`・測驗最佳 ${Math.max(...q)}%`:''}</div></a>`; }).join('')}</div>
  <h2>📱 加到主畫面（離線也能複習）</h2>
  <div class="card small">
    <div><b>iPhone（Safari）</b>：點下方「分享」→「加入主畫面」。</div>
    <div><b>Galaxy Z Fold（Chrome / Samsung Internet）</b>：點右上「⋮」→「加到主畫面／安裝應用程式」。摺疊、展開都能用；展開時會變成左右兩欄。</div>
    <div><b>電腦（Chrome / Edge）</b>：網址列右側的「安裝」圖示，或直接用書籤。</div>
    <div class="mute" style="margin-top:4px">第一次開啟後，音檔會自動存到裝置，之後沒網路也能播放（可在 ⚙︎ 設定中檢查）。</div>
  </div>
  <div class="foot">出處說明：課名、本文、文型編號與頁碼皆依使用者提供的《文化初級日本語Ⅰ テキスト改訂版》課本 PDF 整理；標「課本原文」者為課本本文逐句收錄（註明頁碼），同文型聽力練習全部為課本文型例句與練習例（標頁碼）；標「實用會話」者為本 App 依該課及之前文型自編。單字中文參考官方語彙表（繁體中文）。語音為 AI 合成（非課本 CD），使用 VOICEVOX（VOICEVOX:No.7、VOICEVOX:冥鳴ひまり、VOICEVOX:玄野武宏、VOICEVOX:雀松朱司）。僅供個人學習使用。</div>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin:10px 0 4px;font-size:11px;color:#9aa0a6"><span id="viewCount">${viewCountText()}</span><a href="https://thwang40.github.io/jimtof-talk/" style="color:#9aa0a6;text-decoration:none">展會會話 ›</a></div>`;
}

function viewLesson(n){
  const L = LESSON[n]; if(!L) return viewHome();
  renderSide(n); reveal = {};
  current = {type:'review', keys: FLOW[n].flatMap(d => d.lines.map((_,i)=>d.id+':'+i))};
  const gs = Object.entries(B.grammar).filter(([k,g])=>g.l===n);
  $('#view').innerHTML = `
  <div class="crumb"><a href="#/">首頁</a> › ${lessonLabel(n)}</div>
  <h1>${n?`第${n}課　`:''}${esc(L.t)}</h1>
  <div class="kana">${esc(L.r)}</div><div class="mute">${esc(L.zh)}・${esc(L.topic)}</div>
  ${UNCERTAIN[n]?`<div class="scene">⚠️ 注意：${esc(UNCERTAIN[n])}，其他文型已對照官方資料。</div>`:''}
  <div class="row" style="margin:6px 0"><span class="small mute">課本 p.${L.pages[0]}–${L.pages[1]}</span><a class="btn sm" style="text-decoration:none" href="#/p/${L.n}/0">📄 課本頁面（${L.pages[1]-L.pages[0]+1} 頁）</a></div>
  ${playerHTML(true)}
  <div class="small" id="nowPlaying" style="min-height:1.2em;margin:-4px 0 4px"></div>
  <div class="small mute" style="margin:0 0 8px">「全部播放」會依下面的順序（課本頁序 → 實用會話）一句一句播完整課。</div>
  <h2>📖 課本內容（依課本頁序${n?'：本文＋文型':''}）</h2>
  <div class="dlist">${FLOW[n].filter(d=>d.drill||isText(d)).map(fCard).join('')}</div>
  ${n?`<h2>🎧 實用會話（依本課文型自編）</h2>
  <div class="dlist">${FLOW[n].filter(d=>!d.drill&&!isText(d)).map(fCard).join('')}</div>`:''}
  <div class="row" style="margin-top:10px"><a class="btn" style="text-decoration:none" href="#/q/L${n}">✏️ ${lessonLabel(n)} 聽力測驗</a></div>
  ${pagesSection(L)}
  <details ${gs.length<=0?'':''}><summary>📚 ${n?'本課文型':'入門項目'}（${gs.length}）</summary><div class="gl">${gs.map(([k,g])=>gItemHTML(k,g)).join('')}</div></details>
  <div class="row" style="margin-top:14px">${n>0?`<a class="btn ghost" style="text-decoration:none" href="#/l/${n-1}">‹ ${lessonLabel(n-1)}</a>`:''}${n<12?`<a class="btn ghost" style="text-decoration:none" href="#/l/${n+1}">第${n+1}課 ›</a>`:''}</div>`;
  bindPlayer();
}

function gItemHTML(k, g){ return `<div class="g"><b>${esc(gLabel(k))}</b><div class="ex">${esc(g.ex)}</div><div class="small mute">${esc(g.zh)}</div>${DRILL[k]?`<a class="btn sm ghost" style="text-decoration:none;margin-top:6px" href="#/g/${k}">🎧 同文型聽力練習（${DRILL[k].lines.length} 句）</a>`:''}</div>`; }
// ---- 文型／同文型頁：仿課本「文型 1」排版（標題句 → 1) 2) …；A/B 子行；練習・※ 小節；表格類精簡列）----
function drillParse(d){
  const cnt = {}; d.lines.forEach(l => { const t = (l.tag||'').trim(); cnt[t] = (cnt[t]||0) + 1; });
  let prevNum = null, prevHead = null, prevPg = null;
  return d.lines.map((ln, i) => {
    const t = (ln.tag||'').trim(); let m, r = {kind:'other', left:'', who:'', head:'', note:'', pg:null};
    if((m = t.match(/^文型\s*(.*)$/))){ r.kind = 'main'; r.left = prevNum==='main' ? '' : '文型'; r.who = m[1].replace(/^（(.*)）$/,'$1').trim(); prevNum = 'main'; }
    else if((m = t.match(/^(\d+)\)\s*(.*)$/))){ r.kind = 'num'; r.left = prevNum===m[1] ? '' : m[1]+')'; r.who = m[2]; prevNum = m[1]; }
    else if((m = t.match(/^練習(\S+)\s*(例\d*)?\s*(.*)$/))){ r.kind = 'ex'; r.head = `練習${m[1]}${m[2]?' '+m[2]:''}`; r.who = m[3]; prevNum = null; }
    else if(t[0]==='※'){ r.kind = 'ex'; r.head = '※'; const w = t.slice(1).trim(); if(/^（/.test(w)) r.note = w; else r.who = w; prevNum = null; }
    else if(t && cnt[t] > 1){ r.kind = 'list'; r.head = t; prevNum = null; }
    else { r.kind = 'list'; r.note = t; prevNum = null; }
    if(r.head && r.head === prevHead) r.head = ''; else if(r.head) prevHead = r.head;
    if(r.kind==='main' || r.kind==='num') prevHead = null;
    if(ln.pg && prevPg && ln.pg !== prevPg) r.pg = ln.pg; prevPg = ln.pg || prevPg;
    return r;
  }).map((r, _, all) => { if(!all.whoIdx){ all.whoIdx = {}; all.forEach(x => { if(x.who && !(x.who in all.whoIdx)) all.whoIdx[x.who] = Object.keys(all.whoIdx).length; }); }
    r.color = r.who ? SPK_COLORS[all.whoIdx[r.who] % SPK_COLORS.length] : ''; return r; });
}
function drillRowHTML(d, i, P){
  const ln = d.lines[i], key = d.id+':'+i, r = (P || drillParse(d))[i];
  const lv = S.listenFirst ? (reveal[key]||0) : 2;
  const who = r.who ? `<span class="swho" style="color:${r.color}">${esc(r.who)}：</span>` : '';
  const body = lv>=1 ? `<div class="ja">${who}${esc(ln.ja)}</div>${S.showKana?`<div class="kana">${esc(ln.kana)}</div>`:''}${lv>=2?`<div class="zh">${esc(ln.zh)}</div>`:''}${r.note?`<div class="snote">${esc(r.note)}</div>`:''}`
                     : (r.who ? `<span class="swho inl" style="color:${r.color}">${esc(r.who)}：</span>` : '') + maskHTML(ln.ja);
  const pre = (r.pg ? `<div class="spg">p.${r.pg}</div>` : '') + (r.head ? `<div class="shead">${esc(r.head)}</div>` : '');
  return pre + `<div class="line srow drow k-${r.kind}${r.left?' first':''}${S.unf[key]?' unf':''}" data-key="${key}">${ufHTML(key)}<div class="snum">${esc(r.left)}</div>
    <div class="stext${lv?'':' masked'}" data-act="rv" data-k="${key}" role="button" tabindex="0" aria-label="${lv>=2?'再點一次隱藏':lv?'顯示中文':'顯示日文'}">${body}</div>
    <div class="sbtns"><button class="ibtn s" data-act="play" data-d="${d.id}" data-i="${i}" aria-label="播放" title="播放">🔊</button><button class="ibtn s" data-act="rep" data-d="${d.id}" data-i="${i}" aria-label="重複三次" title="重複三次">🔁</button><button class="ibtn s" data-act="idk" data-d="${d.id}" data-i="${i}" aria-label="我不會（顯示出處並加入複習）" title="我不會">🙋</button></div>
  </div><div class="srcbox sx" id="src-${key.replace(':','_')}" data-for="${key}"></div>`;
}
function viewDrill(k){
  const d = DRILL[k]; if(!d) return viewHome();
  const g = B.grammar[k], n = d.l, L = LESSON[n];
  renderSide(n); reveal = {};
  current = {type:'dlg', d, idxs: d.lines.map((_,i)=>i)};
  $('#view').innerHTML = `
  <div class="crumb"><a href="#/">首頁</a> › <a href="#/l/${n}">${n?`第${n}課 `:''}${esc(L.t)}</a> › ${n?'同文型練習':esc(g.p)}</div>
  <div class="small"><span class="badge txt">同文型聽力練習・課本例句（${d.lines.length} 句，皆標頁碼）</span></div>
  <div class="hrow"><h1>🎧 ${esc(gLabel(k))}</h1>${bookBtnHTML(d)}</div>
  <div class="scene">💡 ${esc(g.zh)}</div>
  ${playerHTML()}
  <div class="script dscript" id="lines"><div class="dtitle"><span class="dbadge">${n?'文型 '+esc(k.split('-')[1]):'入門'}</span> <span class="small mute">p.${g.pg}</span></div>${(P => d.lines.map((_,i)=>drillRowHTML(d,i,P)).join(''))(drillParse(d))}</div>
  <div class="small mute" style="margin-top:6px">點文字：第 1 次顯示日文、第 2 次顯示中文、第 3 次再隱藏。🔊 播放　🔁 重複三次　🙋 我不會（看出處、加入複習）</div>
  <div class="row" style="margin-top:14px">
    <a class="btn" style="text-decoration:none" href="#/q/${d.id}">✏️ 小測驗：聽到的是哪一句？／意思是？</a>
  </div>
  ${flowNavHTML(d)}`;
  bindPlayer();
}
function fCard(d){ if(!d.drill) return dCard(d); const k = d.drill, g = B.grammar[k];
  return `<a class="card gcard" href="#/g/${k}"><div class="lnum"><span class="badge">${k[0]==='0'?'入門':'文型'+esc(k.split('-')[1])}・p.${g.pg}</span> ${S.quiz[d.id]!=null?`<span class="badge">測驗 ${S.quiz[d.id]}%</span>`:''}</div><div class="ltitle">${esc(g.t||g.p)}</div><div class="small mute">${k[0]==='0'?'課本內容':'課本例句'} ${d.lines.length} 句</div></a>`; }
function dCard(d){ return `<a class="card" href="#/d/${d.id}"><div class="lnum">${d.src?`<span class="badge txt">${esc(d.src.label)}・p.${d.src.page}</span>`:`<span class="badge">實用會話 ${esc(d.id)}</span>`} ${S.done[d.id]?'<span class="badge">已聽完</span>':''} ${S.quiz[d.id]!=null?`<span class="badge">測驗 ${S.quiz[d.id]}%</span>`:''}</div><div class="ltitle">${esc(d.title)}</div><div class="small mute">${esc(d.scene)}（${d.lines.length} 句）</div></a>`; }
/* ---------------- textbook pages ---------------- */
const pageList = L => { const a=[]; for(let p=L.pages[0]; p<=L.pages[1]; p++) a.push(p); return a; };
// 整本課本（使用者提供的 PDF 全部 272 頁，0 = 封面前空白頁；253 起為別冊，頁碼另計）
const BOOKL = {n:'b', t:'整本課本', pages:[0, 271]};
const BOOK_TOC = [{t:'封面・はじめに・このテキストについて・目次', a:0, b:7}]
  .concat(B.lessons.map(l => ({t: l.n ? `第${l.n}課 ${l.t}` : l.t, a:l.pages[0], b:l.pages[1]})))
  .concat([['第13課 インタビュー調査',148,157],['第14課 サラさんの日記',158,165],['第15課 どちらのほうが近いですか。',166,178],['第16課 病院',179,191],['第17課 アルバイト',192,203],['第18課 ドライブに行きませんか。',204,212],
    ['付録：動詞・い形容詞・な形容詞一覧',213,219],['助数詞表',220,222],['文型一覧',223,229],['50音索引',230,252],['別冊 各課索引',253,271]].map(([t,a,b])=>({t,a,b})));
const tocOf = p => BOOK_TOC.find(x => p>=x.a && p<=x.b) || BOOK_TOC[0];
const pLabel = p => p>=254 ? `別冊 p.${p-254}` : p===253 ? '別冊 表紙' : `p.${p}`;
const LOF = n => n==='b' ? BOOKL : LESSON[n];
const pageSrc = p => `pages/p${String(p).padStart(3,'0')}.webp`;
function pagesSection(L){
  const ps = pageList(L);
  return `<h2 id="pages">📄 課本頁面（p.${ps[0]}–${ps[ps.length-1]}，共 ${ps.length} 頁）</h2>
  <div class="row" style="margin-bottom:8px"><a class="btn" style="text-decoration:none" href="#/p/${L.n}/0">📖 翻頁瀏覽</a><button class="btn sm ghost" data-act="pgcache" data-l="${L.n}">⬇︎ 本課頁面存離線</button><span class="small mute" id="pgcInfo"></span></div>
  <div class="thumbs">${ps.map((p,i)=>`<a href="#/p/${L.n}/${i}" class="thumb"><img loading="lazy" decoding="async" src="${pageSrc(p)}" alt="第${L.n}課 課本 p.${p}" width="1200" height="1714"><span>p.${p}</span></a>`).join('')}</div>`;
}
let pv = null;
function viewPage(n, idx){
  const L = LOF(n); if(!L) return viewHome();
  const BK = n==='b';
  const ps = pageList(L); idx = Math.max(0, Math.min(ps.length-1, idx|0)); const p = ps[idx];
  renderSide(BK ? 'book' : n); current = null;
  pv = {n, idx, len: ps.length, zoom: (pv && pv.n===n) ? pv.zoom : 1};
  const prevL = BK ? null : LESSON[n-1], nextL = BK ? null : LESSON[n+1], sec = BK ? tocOf(p) : null;
  $('#view').innerHTML = `
  <div class="crumb"><a href="#/">首頁</a> › ${BK ? '整本課本' : `<a href="#/l/${n}">${n?`第${n}課 `:''}${esc(L.t)}</a> › 課本頁面`}</div>
  ${BK ? `<div class="row pvnav" style="margin:4px 0 8px;gap:6px;flex-wrap:wrap"><select id="bkToc" aria-label="目次" style="max-width:100%;font-size:14px;padding:4px">${BOOK_TOC.map(x=>`<option value="${x.a}" ${x===sec?'selected':''}>${esc(x.t)}（${pLabel(x.a)}–${pLabel(x.b)}）</option>`).join('')}</select>
    <form id="bkGo" style="display:flex;gap:4px;align-items:center"><span class="small">跳到 p.</span><input id="bkNum" type="number" inputmode="numeric" min="0" max="271" value="${p}" style="width:4.5em;font-size:14px;padding:3px"><button class="btn sm ghost">Go</button></form>
    <button class="btn sm ghost" data-act="pgcache" data-l="b" data-a="${sec.a}" data-b="${sec.b}">⬇︎ 這一段存離線</button><span class="small mute" id="pgcInfo"></span></div>` : ''}
  <div class="pvbar">
    <a class="btn sm ghost" href="${idx>0?`#/p/${n}/${idx-1}`:(prevL?`#/p/${n-1}/${pageList(prevL).length-1}`:'#/p/'+n+'/0')}" aria-label="上一頁" style="text-decoration:none">‹ 上一頁</a>
    <div class="pvlabel"><b>${BK ? `${pLabel(p)}<span class="small mute" style="font-weight:normal">・${esc(sec.t.length>14 ? sec.t.slice(0,13)+'…' : sec.t)}</span>` : `${lessonLabel(n)}・p.${p}`}</b><span class="small mute">（${idx+1} / ${ps.length}）</span></div>
    <a class="btn sm ghost" href="${idx<ps.length-1?`#/p/${n}/${idx+1}`:(nextL?`#/p/${n+1}/0`:'#/p/'+n+'/'+idx)}" aria-label="下一頁" style="text-decoration:none">下一頁 ›</a>
  </div>
  <div class="pvtools row"><div class="seg"><button data-z="1" class="${pv.zoom===1?'on':''}">符合寬度</button><button data-z="1.6" class="${pv.zoom===1.6?'on':''}">1.6×</button><button data-z="2.4" class="${pv.zoom===2.4?'on':''}">2.4×</button></div>
    <button class="btn sm ghost" id="pvFull">⛶ 全螢幕</button><a class="btn sm ghost" style="text-decoration:none" href="${pageSrc(p)}" target="_blank" rel="noopener">原圖</a></div>
  <div class="pvwrap" id="pvwrap"><img id="pvimg" width="1200" height="1714" src="${pageSrc(p)}" alt="課本 ${pLabel(p)}" style="width:${pv.zoom*100}%"></div>
  <div class="small mute" style="margin-top:6px">左右滑動或按 ← → 翻頁；點兩下放大／縮小；手機也可以用兩指縮放。${idx===ps.length-1&&nextL?'下一頁會進入第'+(n+1)+'課。':''}</div>
  <div class="pvstrip">${(BK ? ps.filter(q=>q>=sec.a&&q<=sec.b) : ps).map(q=>{ const i = ps.indexOf(q); return `<a href="#/p/${n}/${i}" class="${i===idx?'cur':''}">${BK?pLabel(q):'p.'+q}</a>`; }).join('')}</div>`;
  if(BK){ $('#bkToc').onchange = e => { location.hash = `#/p/b/${e.target.value}`; };
    $('#bkGo').onsubmit = e => { e.preventDefault(); const v = Math.max(0, Math.min(271, parseInt($('#bkNum').value,10)||0)); location.hash = `#/p/b/${v}`; }; }
  // preload neighbours
  [ps[idx+1], ps[idx-1]].forEach(q => { if(q){ const im = new Image(); im.src = pageSrc(q); } });
  const wrap = $('#pvwrap'), img = $('#pvimg');
  const setZoom = z => { pv.zoom = z; img.style.width = (z*100)+'%'; document.querySelectorAll('[data-z]').forEach(b=>b.classList.toggle('on', +b.dataset.z===z)); };
  document.querySelectorAll('[data-z]').forEach(b => b.onclick = () => setZoom(+b.dataset.z));
  let lastTap = 0;
  img.addEventListener('click', e => { const t = Date.now(); if(t-lastTap < 350){ setZoom(pv.zoom>1?1:2.4); } lastTap = t; });
  img.addEventListener('dblclick', e => e.preventDefault());
  $('#pvFull').onclick = () => { const el = wrap; if(document.fullscreenElement) document.exitFullscreen(); else if(el.requestFullscreen) el.requestFullscreen().catch(()=>openRaw()); else if(el.webkitRequestFullscreen) el.webkitRequestFullscreen(); else openRaw(); };
  const openRaw = () => window.open(pageSrc(p), '_blank');
  let sx=0, sy=0, multi=false;
  wrap.addEventListener('touchstart', e => { multi = e.touches.length>1; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, {passive:true});
  wrap.addEventListener('touchend', e => {
    if(multi || pv.zoom>1 || (window.visualViewport && visualViewport.scale>1.05)) return;
    const t = e.changedTouches[0], dx = t.clientX-sx, dy = t.clientY-sy;
    if(Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)*1.5) flip(dx<0 ? 1 : -1);
  }, {passive:true});
}
function flip(dir){
  if(!pv) return; const i = pv.idx + dir;
  if(i>=0 && i<pv.len) location.hash = `#/p/${pv.n}/${i}`;
  else if(pv.n==='b') return;
  else if(i<0 && LESSON[pv.n-1]) location.hash = `#/p/${pv.n-1}/${pageList(LESSON[pv.n-1]).length-1}`;
  else if(i>=pv.len && LESSON[pv.n+1]) location.hash = `#/p/${pv.n+1}/0`;
}
document.addEventListener('keydown', e => { if(!location.hash.startsWith('#/p/') || /INPUT|SELECT|TEXTAREA/.test((e.target&&e.target.tagName)||'')) return; if(e.key==='ArrowRight') flip(1); else if(e.key==='ArrowLeft') flip(-1); });
async function cacheLessonPages(n, a, b){
  if(!('caches' in window)) return toast('此瀏覽器不支援離線');
  const ps = n==='b' ? pageList({pages:[a, b]}) : pageList(LESSON[n]); const c = await caches.open('nh-pages-v1'); let k=0;
  for(const p of ps){ try{ if(!(await c.match(pageSrc(p)))) await c.add(pageSrc(p)); }catch(e){} k++; const el=$('#pgcInfo'); if(el) el.textContent=`${k}/${ps.length}`; }
  if(n!=='b') for(const [id, es] of Object.entries(window.SEC||{})) if(DLG[id] && DLG[id].l==n) for(const e of es){ try{ const u='pages/sec/'+e[0]; if(!(await c.match(u))) await c.add(u); }catch(err){} }
  const el=$('#pgcInfo'); if(el) el.textContent = n==='b' ? '這一段已存離線 ✓' : '本課頁面已存離線 ✓';
}
// ---- 📖 課本 p.xx：各項目對應的課本頁面（覆蓋視窗） ----
const SPAN = {'5-T2':[64,65], '6-T1':[70,71], '12-T1':[138,139]}; // 本文跨兩頁
function itemPages(d){
  if(d.drill) return [...new Set(d.lines.map(l=>l.pg).filter(Boolean))].sort((a,b)=>a-b);
  if(d.src) return SPAN[d.id] || [d.src.page];
  return [...new Set(d.lines.flatMap(l=>l.g||[]).map(k=>B.grammar[k] && B.grammar[k].pg).filter(Boolean))].sort((a,b)=>a-b); // 實用會話：所依據的文型頁
}
function pagesLabel(ps){ const run = ps.every((p,i)=>!i || p===ps[i-1]+1); return 'p.' + (ps.length===1 ? ps[0] : run ? `${ps[0]}–${ps[ps.length-1]}` : ps.join('・')); }
function bookBtnHTML(d){ const ps = itemPages(d); if(!ps.length) return '';
  const lab = ps.length>3 && !ps.every((p,i)=>!i || p===ps[i-1]+1) ? `p.${ps[0]} 等 ${ps.length} 頁` : pagesLabel(ps);
  return `<button class="btn sm ghost bookbtn" data-act="bookpg" data-d="${d.id}" title="${d.src||d.drill?'打開課本上這一段':'打開這段會話所依據的課本文型段落'}">📖 課本 ${lab}</button>`; }
// 句子編號：文型／同文型頁依課本編號——文型標題句、1)→第1句、2)→第2句…；練習的例句標「練習x 例」，※ 為參考
function drillNo(ln){
  const t = (ln.tag||'').trim(); let m;
  if((m = t.match(/^文型\s*(.*)$/))){ const r = m[1].replace(/^（(.*)）$/,'$1').trim(); return {pre:'文型', lab:'文型標題句'+(r?` ${r}`:'')}; }
  if((m = t.match(/^(\d+)\)\s*(.*)$/))) return {pre:'', lab:`第${m[1]}句`+(m[2]?` ${m[2]}`:'')};
  if((m = t.match(/^練習(\S+)\s*(.*)$/))) return {pre:'', lab:`練習${m[1]}${m[2]?' '+m[2]:''}`};
  if(t[0]==='※') return {pre:'', lab:'※參考'+(t.slice(1).trim()?' '+t.slice(1).trim():'')};
  return null;
}
function lineNo(d, i){ const ln = d.lines[i]; if(ln.lab) return {pre:'', lab:ln.lab}; if(d.drill){ const r = drillNo(ln); if(r) return r; return {pre:ln.tag||'', lab:`第${i+1}句`}; }
  if(ln.scene) return {pre:'', lab:'課本場景標示'};   // 本文：場景卡片不算句數；其餘一張＝課本一個說話輪次／段落
  return {pre:'', lab:`第${d.lines.slice(0, i+1).filter(l => !l.scene).length}句`}; }
let PM = null;   // 目前開著的課本頁視窗：{el, mode:'side'|'modal', id, ps, i, zoom, go, zoomTo}
const SIDE_MIN = 1100; // 寬螢幕：在內容右側開側邊視窗；較窄（手機）用全螢幕覆蓋
function bookTitle(d){ return d.drill ? gLabel(d.drill).replace(/ p\.[\d・–]+$/,'') : d.src ? `第${d.l}課 ${d.src.label}` : `實用會話 ${d.id}（依據的文型頁）`; }
// 只截取這一項在課本上的那一段（pages/sec/*.webp，見 sec.js）；實用會話＝所依據的各文型段落
function secList(d){ const S2 = window.SEC || {};
  if(d.drill || d.src) return S2[d.id] && S2[d.id].length ? S2[d.id] : null;
  const ks = [...new Set(d.lines.flatMap(l=>l.g||[]))].filter(k=>B.grammar[k]).sort((a,b)=>B.grammar[a].pg-B.grammar[b].pg || (+a.split('-')[1]||0)-(+b.split('-')[1]||0));
  const kk = ks.filter(k=>S2['g'+k]); if(!kk.length) return null;   // 入門的文型沒有截段 → 只列有截段的；「看整頁」仍有全部頁面
  const seen = new Set(); return kk.flatMap(k=>S2['g'+k]).filter(e=>!seen.has(e[0]) && seen.add(e[0])); }
function openBook(d){
  if(PM && PM.mode==='side' && PM.id===d.id){ closePageModal(); return; }   // 再按一次＝收起側邊視窗
  openPageModal(itemPages(d), bookTitle(d), d.id, innerWidth >= SIDE_MIN ? 'side' : 'modal', secList(d));
}
function openPageModal(ps, title, id, mode, sec){
  const keepZoom = PM && PM.mode==='side' && mode==='side' ? PM.zoom : 1;
  closePageModal(true);
  const side = mode==='side';
  const el = document.createElement(side ? 'aside' : 'div'); el.className = side ? 'pm pside' : 'pm';
  if(side) el.setAttribute('aria-label', '課本頁面：'+title); else { el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label', title); }
  el.innerHTML = `<div class="pm-bar"><span class="t">📖 ${esc(title)}</span>
    <button class="btn sm" data-pm="prev" aria-label="上一頁">‹</button><span class="small" id="pmLab"></span><button class="btn sm" data-pm="next" aria-label="下一頁">›</button>
    <div class="seg"><button data-pz="1">符合寬度</button><button data-pz="1.6">1.6×</button><button data-pz="2.4">2.4×</button></div>
    <button class="btn sm pmfull" data-pm="full" hidden>看整頁</button>
    <button class="btn sm" data-pm="close" aria-label="關閉">✕${side?'':' 關閉'}</button></div>
    <div class="pm-wrap" id="pmWrap"></div>`;
  if(side){ document.querySelector('.layout').appendChild(el); document.body.classList.add('has-pside'); }
  else { document.body.appendChild(el); document.body.style.overflow = 'hidden'; }
  PM = {el, mode, id, ps, i:0, zoom:keepZoom, sec: sec || null, full: !sec};
  const wrap = el.querySelector('#pmWrap'), fullBtn = el.querySelector('[data-pm="full"]');
  const show = () => { const secMode = !!(PM.sec && !PM.full), lab = el.querySelector('#pmLab');
    wrap.classList.toggle('secmode', secMode);
    if(secMode){
      if(!wrap.querySelector('.secimg')){ const n = PM.sec.length;
        wrap.innerHTML = PM.sec.map(([f,w,h,p],j)=>`<figure class="secfig">${n>1?`<figcaption>p.${p}（${j+1}/${n}）</figcaption>`:''}<img class="secimg" src="pages/sec/${f}" width="${w}" height="${h}" alt="課本 p.${p}（這一段）"></figure>`).join(''); }
      lab.textContent = pagesLabel([...new Set(PM.sec.map(e=>e[3]))].sort((a,b)=>a-b)) + ' 這一段';
      el.querySelectorAll('[data-pm="prev"],[data-pm="next"]').forEach(b => b.style.display = 'none');
    } else {
      let img = wrap.querySelector('#pmImg'); if(!img){ wrap.innerHTML = '<img id="pmImg" width="1200" height="1714" alt="">'; img = wrap.querySelector('#pmImg'); }
      const p = PM.ps[PM.i]; img.src = pageSrc(p); img.alt = `課本 p.${p}`;
      lab.textContent = `p.${p}` + (PM.ps.length>1 ? `（${PM.i+1}/${PM.ps.length}）` : '');
      el.querySelectorAll('[data-pm="prev"],[data-pm="next"]').forEach(b => { b.style.display = ''; b.style.visibility = PM.ps.length>1 ? 'visible' : 'hidden'; });
      const nx = PM.ps[PM.i+1]; if(nx){ const im = new Image(); im.src = pageSrc(nx); }
    }
    wrap.querySelectorAll('img').forEach(im => im.style.width = (PM.zoom*100)+'%');
    fullBtn.hidden = !PM.sec || !PM.ps.length; fullBtn.textContent = secMode ? '看整頁' : '只看這段';
    fullBtn.title = secMode ? '打開完整的課本頁面' : '回到只顯示這一段';
    el.querySelectorAll('[data-pz]').forEach(b => b.classList.toggle('on', +b.dataset.pz===PM.zoom)); wrap.scrollTop = 0;
    document.querySelectorAll('.bookbtn').forEach(b => b.classList.toggle('on', side && b.dataset.d===PM.id)); };
  PM.go = dir => { if(PM.sec && !PM.full) return; const j = PM.i + dir; if(j>=0 && j<PM.ps.length){ PM.i = j; show(); } };
  PM.zoomTo = z => { PM.zoom = z; show(); };
  PM.show = show;
  el.addEventListener('click', e => { const b = e.target.closest('[data-pm],[data-pz]'); if(!b) return;
    if(b.dataset.pz) PM.zoomTo(+b.dataset.pz); else if(b.dataset.pm==='close') closePageModal();
    else if(b.dataset.pm==='full'){ PM.full = !PM.full; PM.i = 0; show(); }
    else PM.go(b.dataset.pm==='next' ? 1 : -1); });
  let last = 0; wrap.addEventListener('click', e => { if(e.target.tagName!=='IMG') return; const t = Date.now(); if(t-last < 350) PM.zoomTo(PM.zoom>1 ? 1 : 2.4); last = t; });
  let sx=0, sy=0, multi=false;
  wrap.addEventListener('touchstart', e => { multi = e.touches.length>1; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, {passive:true});
  wrap.addEventListener('touchend', e => { if(multi || PM.zoom>1 || (window.visualViewport && visualViewport.scale>1.05)) return;
    const t = e.changedTouches[0], dx = t.clientX-sx, dy = t.clientY-sy; if(Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)*1.5) PM.go(dx<0 ? 1 : -1); }, {passive:true});
  show();
  if(!side){ try{ history.pushState({pm:1}, ''); PM.pushed = true; }catch(e){} el.querySelector('[data-pm="close"]').focus(); }   // 手機「返回」鍵／手勢 = 關閉
}
function closePageModal(silent){
  if(!PM) return; const pm = PM; PM = null;
  pm.el.remove();
  if(pm.mode==='side'){ document.body.classList.remove('has-pside'); document.querySelectorAll('.bookbtn.on').forEach(b => b.classList.remove('on')); }
  else document.body.style.overflow = '';
  if(!silent && pm.pushed && history.state && history.state.pm) history.back();
}
// 換到別的項目：側邊視窗跟著換成新項目的課本頁；沒有課本頁的畫面（首頁、課次總覽…）就收起
function syncBookPanel(){
  if(!PM || PM.mode!=='side') return;
  const m = location.hash.match(/^#\/(d|g)\/([^/?]+)/), d = m && (m[1]==='g' ? DLG['g'+decodeURIComponent(m[2])] : DLG[decodeURIComponent(m[2])]);
  const ps = d ? itemPages(d) : [];
  if(!ps.length || innerWidth < SIDE_MIN){ closePageModal(true); return; }
  if(d.id !== PM.id) openPageModal(ps, bookTitle(d), d.id, 'side', secList(d)); else PM.show();
}
addEventListener('resize', () => { if(PM && PM.mode==='side' && innerWidth < SIDE_MIN) closePageModal(true); });
window.addEventListener('popstate', () => { if(PM && PM.mode==='modal'){ PM.pushed = false; closePageModal(true); } });
document.addEventListener('keydown', e => { if(!PM || /INPUT|SELECT|TEXTAREA/.test((e.target&&e.target.tagName)||'')) return;
  if(e.key==='Escape'){ e.preventDefault(); closePageModal(); } else if(e.key==='ArrowRight') PM.go(1); else if(e.key==='ArrowLeft') PM.go(-1); }, true);

let reveal = {}; // key -> level 0..2
function lineHTML(d, i, opts={}){
  const ln = d.lines[i]; const key = d.id+':'+i; const sp = d.sp[ln.s];
  const lv = S.listenFirst ? (reveal[key]||0) : 2;
  const inRev = !!S.review[key];
  return `<div class="line${S.unf[key]?' unf':''}" data-key="${key}">
    <div class="lhead">${ufHTML(key, ln.scene)}<span class="spk ${ln.s}">${esc(sp.name)}</span><span class="small mute">${d.drill&&!opts.showId?`p.${ln.pg}${lineNo(d,i).pre?' '+esc(lineNo(d,i).pre):''}・`:''}${opts.showId?`${d.drill?`${d.l?'文型'+d.drill:'入門'} p.${ln.pg}`:d.src?`第${d.l}課${d.src.label} p.${d.src.page}`:d.id}・`:''}${esc(lineNo(d,i).lab)}</span>
      <div class="lbtns"><button class="ibtn" data-act="play" data-d="${d.id}" data-i="${i}" aria-label="播放這句">🔊</button><button class="ibtn" data-act="rep" data-d="${d.id}" data-i="${i}" aria-label="重複三次">🔁</button></div></div>
    ${S.listenFirst&&lv>=1?`<div class="lrv" data-act="rv" data-k="${key}" role="button" tabindex="0" aria-label="${lv===1?'顯示中文':'隱藏'}">`:''}${lv>=1?`<div class="ja">${esc(ln.ja)}</div>${S.showKana?`<div class="kana">${esc(ln.kana)}</div>`:''}`:`<button class="hiddenText" data-act="rv" data-k="${key}">👂 先聽聽看… 點這裡顯示日文</button>`}
    ${lv>=2?`<div class="zh">${esc(ln.zh)}</div>`:''}${S.listenFirst&&lv>=1?'</div>':''}
    <div class="reveal-actions">
      ${lv===1?`<button class="btn sm ghost" data-act="rv" data-k="${key}">顯示中文</button>`:lv===2&&S.listenFirst?`<button class="btn sm ghost" data-act="rv" data-k="${key}">隱藏</button>`:''}
      <button class="btn sm alt" data-act="idk" data-d="${d.id}" data-i="${i}">🙋 我不會</button>
      ${inRev && opts.review?`<button class="btn sm ok" data-act="got" data-k="${key}">✓ 我會了</button>`:''}
    </div>
    <div class="srcbox" id="src-${key.replace(':','_')}"></div>
  </div>`;
}
function playerHTML(noMode){
  return `<div class="player"><div class="row">
    <button class="btn" id="playAllBtn">▶ 全部播放</button>
    <div class="seg" role="group" aria-label="速度"><button data-sp="0.7" class="${S.speed<1?'on':''}">0.7x</button><button data-sp="1" class="${S.speed>=1?'on':''}">1x</button></div>
    ${noMode?'':`<div class="seg" role="group" aria-label="模式"><button data-mode="listen" class="${S.listenFirst?'on':''}">聽力優先</button><button data-mode="show" class="${!S.listenFirst?'on':''}">顯示全文</button></div>`}
  </div></div>`;
}
let current = null; // {type, d, idxs}
// ---- 本文／實用會話：仿課本的對話框排版（一個輪次一行：說話者｜文字）----
const SPK_COLORS = ['#1b5fa8','#be1e2d','#2f7d32','#8a4fbf','#b8620b','#0f7c86'];
function isNarr(d){ const ss = new Set(d.lines.filter(l=>!l.scene).map(l=>l.s)); return ss.size===1; }
function spkColor(d, s){ const ks = Object.keys(d.sp).filter(k=>k!=='S'); return SPK_COLORS[Math.max(0, ks.indexOf(s)) % SPK_COLORS.length]; }
function maskHTML(t){ const n = Math.max(3, [...t.replace(/[（）]/g,'')].length), per = 22; let h = '';
  for(let r = n; r > 0; r -= per) h += `<span class="mask" style="width:${Math.min(r, per)*0.95+0.5}em"></span>`;
  return h + `<span class="sr">（點一下顯示日文）</span>`; }
function rowHTML(d, i){
  const ln = d.lines[i], key = d.id+':'+i, sp = d.sp[ln.s];
  const lv = S.listenFirst ? (reveal[key]||0) : 2, narr = isNarr(d) && !ln.scene;
  const name = ln.scene ? '' : narr ? '' : `<div class="sname" style="color:${spkColor(d, ln.s)}">${esc(sp.name)}<span class="colon">：</span></div>`;
  const body = (ln.scene ? '<span class="stag">場景</span>' : '') + (lv>=1 ? `<div class="ja">${esc(ln.ja)}</div>${S.showKana?`<div class="kana">${esc(ln.kana)}</div>`:''}${lv>=2?`<div class="zh">${esc(ln.zh)}</div>`:''}` : maskHTML(ln.ja));
  return `<div class="line srow${ln.scene?' sscene':''}${narr?' snarr':''}${S.unf[key]?' unf':''}" data-key="${key}">${ufHTML(key, ln.scene)}${name}
    <div class="stext${lv?'':' masked'}" data-act="rv" data-k="${key}" role="button" tabindex="0" aria-label="${lv>=2?'再點一次隱藏':lv?'顯示中文':'顯示日文'}">${body}</div>
    <div class="sbtns"><button class="ibtn s" data-act="play" data-d="${d.id}" data-i="${i}" aria-label="播放" title="播放">🔊</button>${ln.scene?'':`<button class="ibtn s" data-act="rep" data-d="${d.id}" data-i="${i}" aria-label="重複三次" title="重複三次">🔁</button>`}<button class="ibtn s" data-act="idk" data-d="${d.id}" data-i="${i}" aria-label="我不會（顯示出處並加入複習）" title="我不會">🙋</button></div>
  </div><div class="srcbox sx" id="src-${key.replace(':','_')}" data-for="${key}"></div>`;
}
function illList(d){ return (window.ILL||{})[d.id] || []; }
function illThumb(d, e, j, cls){ const [f,w,h,p] = e; return `<button class="illb${cls||''}" data-act="ill" data-d="${d.id}" data-j="${j}" aria-label="放大插圖（p.${p}）" title="p.${p}"><img src="pages/ill2/${f}" width="${w}" height="${h}" alt="課本插圖 p.${p}" decoding="async"></button>`; }
function illHTML(d){
  const L = illList(d); if(L.length!==1 || L[0][4]) return '';
  return `<div class="ill">${illThumb(d, L[0], 0)}<div class="illcap">插圖 p.${L[0][3]}</div></div>`;
}
/* rows with per-sentence pictures: wrap runs of rows; each run gets its own picture cell */
function scriptRowsHTML(d){
  const L = illList(d), rows = d.lines.map((_,i)=>rowHTML(d,i));
  if(!L.some(e=>e[4])) return rows.join('');
  const spans = []; L.forEach((e,j)=>{ if(!e[4]) return; const [a,b] = e[4]; let s = spans.find(x=>x.a===a && x.b===b); if(!s) spans.push(s = {a, b, js:[]}); s.js.push(j); });
  spans.sort((x,y)=>x.a-y.a);
  let html = '', i = 0;
  const grp = (a, b, js) => `<div class="igrp${js.length?'':' noimg'}"><div class="igrows">${rows.slice(a, b+1).join('')}</div><div class="igimg${js.length>1?' two':''}">${js.map(j=>illThumb(d, L[j], j)).join('')}</div></div>`;
  for(const s of spans){ if(s.a > i) html += grp(i, s.a-1, []); html += grp(s.a, s.b, s.js); i = s.b+1; }
  if(i < rows.length) html += grp(i, rows.length-1, []);
  return `<div class="igrid">${html}</div><div class="illcap">插圖 ${[...new Set(L.map(x=>'p.'+x[3]))].join('・')}</div>`;
}
function openIll(id, j){
  const L = (window.ILL||{})[id]; if(!L) return; let k = j;
  const box = document.createElement('div'); box.className = 'illbox'; box.setAttribute('role','dialog'); box.setAttribute('aria-label','插圖');
  const draw = () => { const [f,,,p] = L[k]; box.innerHTML = `<img src="pages/ill2/${f}" alt="課本插圖 p.${p}"><div class="illbar">${L.length>1?`<button class="ibtn" data-x="prev" aria-label="上一張">‹</button>`:''}<span>p.${p}${L.length>1?`　${k+1} / ${L.length}`:''}</span>${L.length>1?`<button class="ibtn" data-x="next" aria-label="下一張">›</button>`:''}<button class="ibtn" data-x="close" aria-label="關閉">✕</button></div>`; };
  const close = () => { box.remove(); document.removeEventListener('keydown', onKey); window.removeEventListener('hashchange', close); };
  const onKey = e => { if(e.key==='Escape') close(); else if(e.key==='ArrowRight' && L.length>1){ k=(k+1)%L.length; draw(); } else if(e.key==='ArrowLeft' && L.length>1){ k=(k+L.length-1)%L.length; draw(); } };
  box.onclick = e => { e.stopPropagation(); const x = e.target.closest('[data-x]'); if(x){ if(x.dataset.x==='close') close(); else { k = (k + (x.dataset.x==='next'?1:L.length-1)) % L.length; draw(); } return; } close(); };
  document.addEventListener('keydown', onKey); window.addEventListener('hashchange', close); draw(); document.body.appendChild(box);
}
function viewDialogue(id){

  const d = DLG[id]; if(!d) return viewHome();
  renderSide(d.l); reveal = {};
  const L = LESSON[d.l]; const ds = B.dialogues.filter(x=>x.l===d.l); const pos = ds.indexOf(d);
  current = {type:'dlg', d, idxs: d.lines.map((_,i)=>i)};
  $('#view').innerHTML = `
  <div class="crumb"><a href="#/">首頁</a> › <a href="#/l/${d.l}">第${d.l}課 ${esc(L.t)}</a> › ${d.src?esc(d.src.label):'對話 '+d.id}</div>
  <div class="small"><span class="badge ${d.src?'txt':''}">${esc(srcTag(d))}</span></div>
  <div class="hrow"><h1>${esc(d.title)}</h1>${bookBtnHTML(d)}</div>
  <div class="scene">🎬 ${esc(d.scene)}</div>
  ${playerHTML()}
  <div class="script${isNarr(d)?' narr':''}${illHTML(d)?' has-ill':''}" id="lines">${illHTML(d)}${scriptRowsHTML(d)}</div>
  <div class="small mute" style="margin-top:6px">點文字：第 1 次顯示日文、第 2 次顯示中文、第 3 次再隱藏。🔊 播放　🔁 重複三次　🙋 我不會（看出處、加入複習）</div>
  ${splitHTML(d)}
  <div class="row" style="margin-top:14px">
    <a class="btn" style="text-decoration:none" href="#/q/${d.id}">✏️ 這段的聽力測驗</a>
  </div>
  ${flowNavHTML(d)}`;
  bindPlayer();
}
function splitHTML(d){ const v = SPLITD[d.id]; if(!v) return '';
  const n = v.lines.length;
  return `<section class="splitsec" aria-label="逐句聽力練習">
    <div class="splithead"><h2>🎧 逐句聽力練習</h2><button class="btn sm" data-act="dall" data-d="${v.id}">▶ 全部播放</button><span class="small mute">${n} 句</span></div>
    <div class="small mute">上面有人一次說超過三句，這裡拆成一句一句聽。點文字：第 1 次顯示日文、第 2 次顯示中文、第 3 次再隱藏。</div>
    ${v.groups.map(g => { const ln = d.lines[g.ti];
      return `<div class="splitgrp"><div class="splitsrc"><span class="spk ${ln.s}">${esc(d.sp[ln.s].name)}</span> ${esc(lineNo(d, g.ti).lab)}（共 ${g.idx.length} 句）・課本 p.${d.src ? d.src.page : ''}</div>
        <div class="lines">${g.idx.map(k => lineHTML(v, k)).join('')}</div></div>`; }).join('')}
  </section>`; }
function rerenderLine(d, i, opts){
  const key = d.id+':'+i; const el = document.querySelector(`.line[data-key="${key}"]`); if(!el) return;
  const sb = document.getElementById('src-'+key.replace(':','_'));
  const box = sb ? sb.innerHTML : '';
  const hiddenAgain = S.listenFirst && !(reveal[key]||0);
  if(el.classList.contains('srow')){   // 本文／文型／實用會話: panel is a sibling of the row, keep it
    const tmp = document.createElement('div'); tmp.innerHTML = el.classList.contains('drow') ? drillRowHTML(d, i) : rowHTML(d, i);
    el.replaceWith(tmp.querySelector('.srow'));
    if(box && hiddenAgain){ closeSrc(key); return; }
    if(box) setIdk(document.querySelector(`.line[data-key="${key}"]`), true);
    return;
  }
  el.outerHTML = lineHTML(d, i, opts);
  const nel = document.querySelector(`.line[data-key="${key}"]`);
  // hidden again (tap cycle back to 0) → its info panel closes too
  if(box && !hiddenAgain){ nel.querySelector('.srcbox').innerHTML = box; setIdk(nel, true); }
}
function bindPlayer(){
  const pb = $('#playAllBtn');
  if(pb) pb.onclick = async () => {
    if(curPlaying){ stopAll(); return; }
    const c = current; if(!c) return;
    if(c.type==='review'){
      stopAll(); const token = playToken;
      for(const k of c.keys){ const [id,i] = k.split(':'); if(token!==playToken) break; const ok = await playLine(DLG[id], +i, token); if(!ok) break; await wait(800); }
      if(token===playToken) setPlaying(null); return;
    }
    const finished = await playSeq(c.d, c.idxs);
    if(finished && c.type==='dlg'){ S.done[c.d.id] = true; save(); toast('這段聽完了 👍 試試看測驗吧'); }
  };
  document.querySelectorAll('.player [data-sp]').forEach(b => b.onclick = () => { S.speed = +b.dataset.sp; save(); document.querySelectorAll('.player [data-sp]').forEach(x=>x.classList.toggle('on', x===b)); });
  document.querySelectorAll('.player [data-mode]').forEach(b => b.onclick = () => { S.listenFirst = b.dataset.mode==='listen'; const y = scrollY; route(); window.scrollTo(0, y); });
}

/* review */
function viewReview(){
  renderSide('review');
  const {unf, rev} = revKeys(); const revOnly = rev.filter(k=>!S.unf[k]);
  const keys = unf.concat(revOnly);
  current = {type:'review', keys};
  reveal = {};
  const card = k => { const [id,i]=k.split(':'); return lineHTML(DLG[id], +i, {review:true, showId:true}); };
  $('#view').innerHTML = `
  <div class="crumb"><a href="#/">首頁</a> › 複習清單</div>
  <h1>📝 複習清單（${keys.length}）</h1>
  <p class="small mute">在句子左邊打勾＝還不熟悉；答錯或按「我不會」的句子也會自動加進來。</p>
  ${keys.length? playerHTML() + `<div class="row" style="margin:6px 0 10px"><a class="btn alt" style="text-decoration:none" href="#/q/review">✏️ 複習測驗</a></div>` : `<div class="card">目前沒有需要複習的句子 🎉</div>`}
  ${unf.length?`<h2 class="revh">☑️ 還不熟悉的句子（${unf.length}）<span class="small mute">取消打勾就會移除</span></h2><div class="lines">${unf.map(card).join('')}</div>`:''}
  ${revOnly.length?`<h2 class="revh">🙋 答錯／我不會（${revOnly.length}）<span class="small mute">聽熟了就按「✓ 我會了」</span></h2><div class="lines">${revOnly.map(card).join('')}</div>`:''}`;
  bindPlayer();
}

/* quiz */
let Q = null;
function buildQuiz(scope){
  let items = [];
  if(scope==='review') items = [...new Set(Object.keys(S.review).concat(Object.keys(S.unf)))].map(k=>{ const [id,i]=k.split(':'); return [DLG[id], +i]; }).filter(x=>x[0]&&x[0].lines[x[1]]);
  else if(scope[0]==='L'){ const n = +scope.slice(1); (n===0 ? FLOW[0] : B.dialogues.filter(d=>d.l===n)).forEach(d=>d.lines.forEach((ln,i)=>items.push([d,i]))); }
  else { const d = DLG[scope]; if(d) d.lines.forEach((ln,i)=>items.push([d,i])); }
  items = items.filter(([d,i]) => d.lines[i].ja.length >= 4 && !d.lines[i].scene);
  items = shuffle(items).slice(0, scope[0]==='L' ? 10 : 8);
  const pool = B.dialogues.flatMap(d => d.lines.map((ln,i)=>({d,i,ln}))).filter(p => !p.ln.scene);
  return items.map(([d,i], qi) => {
    const ln = d.lines[i]; const type = qi % 2 === 0 ? 'hear' : 'mean';
    const field = type==='hear' ? 'ja' : 'zh';
    const near = d.drill ? shuffle(d.lines.map((l2,i2)=>({d,i:i2,ln:l2})).filter(p => p.ln[field] !== ln[field])).concat(shuffle(Object.values(DRILL).filter(x=>x!==d && x.l===d.l).flatMap(x=>x.lines.map((l2,i2)=>({d:x,i:i2,ln:l2}))))) : shuffle(pool.filter(p => p.ln[field] !== ln[field] && Math.abs(p.d.l - d.l) <= 1));
    const far = shuffle(pool.filter(p => p.ln[field] !== ln[field]));
    const opts = []; const seen = new Set([ln[field]]);
    for(const p of near.concat(far)){ if(opts.length>=3) break; if(!seen.has(p.ln[field])){ seen.add(p.ln[field]); opts.push(p.ln[field]); } }
    return {d, i, type, answer: ln[field], options: shuffle(opts.concat([ln[field]]))};
  });
}
function viewQuiz(scope){
  const qs = buildQuiz(scope);
  let back = '#/', backName = '首頁', title = '聽力測驗';
  if(scope==='review'){ back='#/review'; backName='複習清單'; title='複習測驗'; renderSide('review'); }
  else if(scope[0]==='L'){ const n=+scope.slice(1); back=`#/l/${n}`; backName=lessonLabel(n); title=`${lessonLabel(n)} 聽力測驗`; renderSide(n); }
  else if(DLG[scope] && DLG[scope].drill){ const k=DLG[scope].drill; back=`#/g/${k}`; backName='同文型練習'; title=`${gLabel(k)} 小測驗`; renderSide(DLG[scope].l||1); }
  else if(DLG[scope]){ back=`#/d/${scope}`; backName=`對話 ${scope}`; title=`${DLG[scope].src?`第${DLG[scope].l}課${DLG[scope].src.label}`:'對話 '+scope}「${DLG[scope].title}」測驗`; renderSide(DLG[scope].l); }
  if(!qs.length){ $('#view').innerHTML = `<div class="crumb"><a href="${back}">‹ ${backName}</a></div><div class="card">沒有可以出題的句子。</div>`; return; }
  Q = {scope, qs, idx:0, score:0, back, backName, title};
  renderQ();
}
function renderQ(){
  const q = Q.qs[Q.idx]; current = null;
  $('#view').innerHTML = `
  <div class="crumb"><a href="${Q.back}">‹ ${esc(Q.backName)}</a></div>
  <h1>${esc(Q.title)}</h1>
  <div class="small mute">第 ${Q.idx+1} / ${Q.qs.length} 題・答對 ${Q.score}</div>
  <div class="bar"><i style="width:${Q.idx/Q.qs.length*100}%"></i></div>
  <div class="card" style="margin-top:10px">
    <div class="q">${q.type==='hear' ? '🎧 你聽到的是哪一句？' : '🎧 這句話是什麼意思？'}</div>
    <div class="row" style="margin-bottom:10px">
      <button class="btn" id="qPlay">🔊 再聽一次</button>
      <div class="seg"><button data-qs="0.7" class="${S.speed<1?'on':''}">0.7x</button><button data-qs="1" class="${S.speed>=1?'on':''}">1x</button></div>
    </div>
    <div class="opts">${q.options.map((o,k)=>`<button class="opt ${q.type==='hear'?'jp':''}" data-k="${k}">${esc(o)}</button>`).join('')}</div>
    <div class="row" style="margin-top:10px"><button class="btn sm alt" id="qIdk">🙋 我不會</button></div>
    <div id="qFeedback"></div>
  </div>`;
  const d = q.d;
  const lineObj = {id:d.id};
  $('#qPlay').onclick = () => playLine(d, q.i);
  document.querySelectorAll('[data-qs]').forEach(b => b.onclick = () => { S.speed = +b.dataset.qs; save(); document.querySelectorAll('[data-qs]').forEach(x=>x.classList.toggle('on', x===b)); playLine(d, q.i); });
  document.querySelectorAll('.opt').forEach(b => b.onclick = () => answerQ(q.options[+b.dataset.k], b));
  $('#qIdk').onclick = () => answerQ(null, null);
  setTimeout(()=>playLine(d, q.i), 250);
}
function answerQ(choice, btn){
  const q = Q.qs[Q.idx]; if(q.answered) return; q.answered = true;
  const right = choice === q.answer;
  document.querySelectorAll('.opt').forEach(b => { b.disabled = true; if(q.options[+b.dataset.k]===q.answer) b.classList.add('right'); });
  if(btn && !right) btn.classList.add('wrong');
  $('#qIdk').disabled = true;
  if(right) Q.score++; else addReview(q.d, q.i, choice===null ? '我不會' : '答錯');
  const ln = q.d.lines[q.i];
  $('#qFeedback').innerHTML = `
    <div class="result ${right?'good':'bad'}">${right ? '⭕ 答對了！' : (choice===null ? '沒關係，來看出處 👇' : '❌ 答錯了，來看出處 👇')}</div>
    <div class="ja">${esc(ln.ja)}</div><div class="kana">${esc(ln.kana)}</div><div class="zh">${esc(ln.zh)}</div>
    ${right ? `<details><summary class="small">看出處</summary>${srcHTML(q.d,q.i)}</details>` : srcHTML(q.d, q.i)}
    ${!right?'<div class="small mute" style="margin-top:6px">已加入複習清單。</div>':''}
    <div class="row" style="margin-top:10px"><button class="btn" id="qNext">${Q.idx+1<Q.qs.length?'下一題 ›':'看結果'}</button></div>`;
  $('#qNext').onclick = () => { stopAll(); Q.idx++; if(Q.idx<Q.qs.length) renderQ(); else finishQ(); };
}
function finishQ(){
  const pct = Math.round(Q.score/Q.qs.length*100);
  if(DLG[Q.scope]){ S.quiz[Q.scope] = Math.max(S.quiz[Q.scope]||0, pct); S.done[Q.scope] = true; save(); }
  if(Q.scope[0]==='L'){ const n=+Q.scope.slice(1); B.dialogues.filter(d=>d.l===n).forEach(d=>{ if(S.quiz[d.id]==null) S.quiz[d.id]=pct; }); save(); }
  $('#view').innerHTML = `<div class="crumb"><a href="${Q.back}">‹ ${esc(Q.backName)}</a></div>
  <h1>${esc(Q.title)}：結果</h1>
  <div class="card"><div style="font-size:40px;font-weight:800;color:${pct>=80?'var(--ok)':'var(--red)'}">${pct}%</div><div>答對 ${Q.score} / ${Q.qs.length} 題</div>
  <div class="row" style="margin-top:12px"><button class="btn" id="again">再測一次</button><a class="btn alt" style="text-decoration:none" href="#/review">📝 複習清單（${revCount()}）</a><a class="btn ghost" style="text-decoration:none" href="${Q.back}">回到${esc(Q.backName)}</a></div></div>`;
  $('#again').onclick = () => viewQuiz(Q.scope);
}

/* ---------------- global clicks ---------------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if(!b) return;
  const act = b.dataset.act;
  if(act==='play'){ playLine(DLG[b.dataset.d], +b.dataset.i); }
  else if(act==='rep'){ playSeq(DLG[b.dataset.d], [+b.dataset.i], 900, 3); toast('重複 3 次'); }
  else if(act==='rv'){ const k = b.dataset.k; reveal[k] = ((reveal[k]||0)+1) % 3; const [id,i] = k.split(':'); rerenderLine(DLG[id], +i, current&&current.type==='review'?{review:true,showId:true}:{}); }
  else if(act==='idk'){
    const d = DLG[b.dataset.d], i = +b.dataset.i, k = d.id+':'+i;
    const sb = document.getElementById('src-'+k.replace(':','_'));
    if(sb && sb.innerHTML.trim()){ closeSrc(k); return; }   // 2nd 🙋 closes the panel
    reveal[k] = 2; addReview(d, i, '我不會');
    rerenderLine(d, i, current&&current.type==='review'?{review:true,showId:true}:{});
    openSrc(d, i);
    toast('已加入複習清單');
  }
  else if(act==='srcclose'){ closeSrc(b.dataset.k, b.classList.contains('bot')); }
  else if(act==='drv'){ const el = b.closest('.dline'); const lv = (+el.dataset.lv + 1) % 3; el.dataset.lv = lv; el.querySelector('.dtext').innerHTML = drillTextHTML(DLG[el.dataset.d], +el.dataset.i, lv); }
  else if(act==='dall'){ const d = DLG[b.dataset.d]; if(curPlaying && curPlaying.startsWith(d.id+':')){ stopAll(); return; } playSeq(d, d.lines.map((_,i)=>i)); }
  else if(act==='spd'){ S.speed = +b.dataset.sp; save(); document.querySelectorAll('[data-sp],[data-qs]').forEach(x=>x.classList.toggle('on', +(x.dataset.sp||x.dataset.qs)===S.speed)); }
  else if(act==='ill'){ openIll(b.dataset.d, +b.dataset.j); }
  else if(act==='bookpg'){ const d = DLG[b.dataset.d]; if(d) openBook(d); }
  else if(act==='pgcache'){ b.dataset.l==='b' ? cacheLessonPages('b', +b.dataset.a, +b.dataset.b) : cacheLessonPages(+b.dataset.l); }
  else if(act==='got'){ delete S.review[b.dataset.k]; save(); toast('太棒了！已從複習清單移除'); viewReview(); }
});
$('#speedBtn').onclick = () => { S.speed = S.speed<1 ? 1 : 0.7; save(); toast('播放速度 '+(S.speed<1?'0.7x':'1x')); document.querySelectorAll('[data-sp],[data-qs]').forEach(x=>x.classList.toggle('on', +(x.dataset.sp||x.dataset.qs)===S.speed)); };
$('#settingsBtn').onclick = openSettings;
$('#sheet').addEventListener('click', e => { if(e.target.id==='sheet') closeSheet(); });
document.addEventListener('change', e => {
  const cb = e.target.closest && e.target.closest('input[data-uf]'); if(!cb) return;
  const k = cb.dataset.uf;
  if(cb.checked) S.unf[k] = Date.now(); else delete S.unf[k];
  save();
  document.querySelectorAll(`.line[data-key="${k}"]`).forEach(el => el.classList.toggle('unf', cb.checked));
  const sl = document.querySelector('#side a[href="#/review"]'); if(sl) sl.textContent = `📝 複習清單（${revCount()}）`;
  toast(cb.checked ? '已標記：還不熟悉（在複習清單）' : '已取消標記');
  if(current && current.type==='review' && !cb.checked){ const y = scrollY; viewReview(); window.scrollTo(0, y); }
});
document.addEventListener('keydown', e => { if((e.key==='Enter' || e.key===' ') && e.target.matches && e.target.matches('[role="button"][data-act]')){ e.preventDefault(); e.target.click(); } });
function closeSheet(){ $('#sheet').classList.add('hidden'); }
async function cacheStatus(){
  if(!('caches' in window)) return '此瀏覽器不支援離線快取';
  try{ const ks = await caches.keys(); let n=0; for(const k of ks){ const c = await caches.open(k); const r = await c.keys(); n += r.filter(x=>/\.mp3$/.test(x.url)).length; } return `已離線儲存音檔：${n} / ${B.dialogues.concat(Object.values(DRILL), Object.values(SPLITD)).reduce((a,d)=>a+d.lines.length*2,0)}`; }catch(e){ return '無法讀取快取狀態'; }
}
async function openSettings(){
  $('#sheetBody').innerHTML = `<h2 style="margin-top:0">⚙︎ 設定</h2>
  <div class="card" style="display:grid;gap:12px">
    <div><b>語音來源</b><div class="seg" style="margin-top:6px"><button data-eng="mp3" class="${S.engine==='mp3'?'on':''}">預錄 MP3（建議）</button><button data-eng="tts" class="${S.engine==='tts'?'on':''}">裝置語音</button></div>
      <div class="small mute">MP3 為 AI 合成的日語語音（VOICEVOX，依標準重音調整），離線可播。裝置語音使用手機/電腦內建 ja-JP 語音${jaVoice?`（目前：${esc(jaVoice.name)}）`:'（尚未偵測到日語語音）'}。</div></div>
    <div><b>顯示假名讀音</b><div class="seg" style="margin-top:6px"><button data-kana="1" class="${S.showKana?'on':''}">顯示</button><button data-kana="0" class="${!S.showKana?'on':''}">隱藏</button></div></div>
    <div><b>離線</b><div class="small" id="cacheInfo">檢查中…</div><button class="btn sm ghost" id="dlAll" style="margin-top:6px">⬇︎ 下載全部音檔</button></div>
    <div><b>重設</b><div class="row" style="margin-top:6px"><button class="btn sm ghost" id="rsReview">清空複習清單</button><button class="btn sm ghost" id="rsAll">清除所有進度</button></div></div>
  </div>
  <div class="foot">版本 2.4（修正「〜ますか」重音與語調）・資料儲存在本裝置（localStorage），不同裝置之間不會同步。</div>
  <div class="row" style="margin-top:10px"><button class="btn" id="closeS">完成</button></div>`;
  $('#sheet').classList.remove('hidden');
  $('#cacheInfo').textContent = await cacheStatus();
  document.querySelectorAll('[data-eng]').forEach(b => b.onclick = () => { S.engine = b.dataset.eng; save(); openSettings(); if(S.engine==='tts') speakTTS('こんにちは'); });
  document.querySelectorAll('[data-kana]').forEach(b => b.onclick = () => { S.showKana = b.dataset.kana==='1'; save(); openSettings(); route(); });
  $('#dlAll').onclick = async () => {
    if(!('caches' in window)) return toast('不支援');
    const urls = B.dialogues.concat(Object.values(DRILL), Object.values(SPLITD)).flatMap(d=>d.lines.flatMap((_,i)=>[`audio/${d.id}_${i}.mp3`,`audio/${d.id}_${i}_s.mp3`]));
    const c = await caches.open('nh-audio-v6'); let n=0;
    for(const u of urls){ try{ if(!(await c.match(u))) await c.add(u); }catch(e){} n++; if(n%20===0) $('#cacheInfo').textContent = `下載中… ${n}/${urls.length}`; }
    $('#cacheInfo').textContent = await cacheStatus();
  };
  $('#rsReview').onclick = () => { if(confirm('確定清空複習清單？')){ S.review = {}; save(); route(); openSettings(); } };
  $('#rsAll').onclick = () => { if(confirm('確定清除所有進度與複習清單？')){ S.done={}; S.quiz={}; S.review={}; save(); route(); openSettings(); } };
  $('#closeS').onclick = closeSheet;
}

/* ---------------- router ---------------- */
function route(){
  stopAll(); closeSheet();
  if(!location.hash.startsWith('#/p/')) pv = null;
  const h = location.hash.replace(/^#\/?/, '');
  const [a, b] = h.split('/');
  if(a==='l') viewLesson(+b);
  else if(a==='d') viewDialogue(b);
  else if(a==='q') viewQuiz(b);
  else if(a==='g') viewDrill(b);
  else if(a==='review') viewReview();
  else if(a==='p') viewPage(b==='b' ? 'b' : +b, +(h.split('/')[2]||0));
  else viewHome();
  updateChips(); window.scrollTo(0,0);
}
window.addEventListener('hashchange', () => { S.listenFirst = true; reveal = {}; route(); syncBookPanel(); });
/* ---------------- page-view counter (footer) ----------------
   Abacus (https://abacus.jasoncameron.dev): free, no signup, CORS *. /hit creates the key on first use and returns {value}.
   Counted once per page load (not per hash route). Daily key uses the Asia/Taipei date. Offline or any error: show nothing. */
const VC_NS = 'thw40-nhstudy-k7q2vx';
let VC = null;
function viewCountText(){ return VC ? `今日瀏覽 ${VC.today.toLocaleString()} 次・總瀏覽 ${VC.total.toLocaleString()} 次` : ''; }
function taipeiDate(){
  try{ return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Taipei', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date()); }
  catch(e){ return new Date(Date.now() + 8*3600e3).toISOString().slice(0, 10); }
}
async function countView(){
  if(navigator.onLine === false || !window.fetch) return;
  const hit = async key => {
    const ac = window.AbortController ? new AbortController() : null; const t = setTimeout(() => ac && ac.abort(), 6000);
    try{ const r = await fetch(`https://abacus.jasoncameron.dev/hit/${VC_NS}/${key}`, {cache:'no-store', signal: ac && ac.signal});
      if(!r.ok) throw 0; const j = await r.json(); if(typeof j.value !== 'number') throw 0; return j.value; }
    finally{ clearTimeout(t); }
  };
  try{
    const [total, today] = await Promise.all([hit('views-total'), hit('views-' + taipeiDate())]);
    VC = {total, today}; const el = document.getElementById('viewCount'); if(el) el.textContent = viewCountText();
  }catch(e){ VC = null; }
}
route();
setTimeout(countView, 1500); // after first render; never blocks the app

if('serviceWorker' in navigator && location.protocol !== 'file:'){
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
})();
