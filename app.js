(function(){
'use strict';
const B = window.BOOK;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS_KEY = 'bunkaListen.v2'; // v2：內容改為依使用者課本 PDF 重建，舊進度不沿用
const S = Object.assign({speed:1, engine:'mp3', listenFirst:true, showKana:true, done:{}, quiz:{}, review:{}}, safeParse(localStorage.getItem(LS_KEY)));
function safeParse(t){ try{ return JSON.parse(t)||{}; }catch(e){ return {}; } }
function save(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(S)); }catch(e){} updateChips(); }
const DLG = {}; B.dialogues.forEach(d => DLG[d.id] = d);
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
  const np = $('#nowPlaying'); if(np){ const [id,i] = (key||'').split(':'); const d = DLG[id]; np.textContent = d ? `▶ ${flowName(d)}・第${+i+1}句：${d.lines[+i].ja}` : ''; }
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
function lessonLabel(l){ return l===0 ? '生活の言葉（第1課前）' : `第${l}課`; }
function gLabel(key){
  const g = B.grammar[key]; if(!g) return key;
  const [l,n] = key.split('-');
  return (l==='0' ? `生活の言葉${n}「${g.p}」` : `第${l}課・文型${n}「${g.p}」`) + (g.pg ? ` p.${g.pg}` : '');
}
function vLabel(w){ const v = B.vocab[w]; if(!v) return ''; return v.l==='補' ? '補充單字' : lessonLabel(v.l); }
function drillSrcHTML(d, i){
  const ln = d.lines[i], k = d.drill, g = B.grammar[k];
  let h = `<div class="src"><div>📖 <b>出處</b>：《${esc(B.title)}》${esc(gLabel(k))}</div>`;
  h += `<div style="margin-top:4px"><span class="tag txt">課本原文</span> ${esc(gLabel(k).replace(/ p\.\d+$/,''))}・<b>p.${ln.pg||g.pg}</b>${ln.tag?`・${esc(ln.tag)}`:''}・第${i+1}句</div>`;
  h += `<div style="margin:4px 0"><div class="small">${esc(g.zh)}</div></div>`;
  if(ln.x && ln.x.length) h += `<div style="margin-top:6px"><b>補充單字</b></div><div class="vocab">${ln.x.map(e=>`<span>${esc(e.w)}（${esc(e.r)}）＝${esc(e.zh)} <em>補充單字</em></span>`).join('')}</div>`;
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
  return h;
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
  h += d.src ? `<div style="margin-top:4px"><span class="tag txt">課本原文</span> 第${d.l}課・${esc(d.src.label)}「${esc(d.title)}」<b>p.${d.src.page}</b>・第${i+1}句</div>`
             : `<div style="margin-top:4px"><span class="tag">實用會話</span> 依第${d.l}課（及之前）文型自編・對話 ${esc(d.id)} 第${i+1}句</div>`;
  if(ln.g.length){
    h += `<div style="margin-top:6px"><b>文型</b></div>`;
    ln.g.forEach(k => { const g = B.grammar[k]; if(!g) return;
      h += `<div style="margin:4px 0"><span class="tag">${esc(gLabel(k))}</span><div class="small">${esc(g.zh)}</div><div class="small ex">課本例句（p.${g.pg}）：${esc(g.ex)}</div></div>`; });
  }
  if(ln.v.length){
    h += `<div style="margin-top:6px"><b>單字</b></div><div class="vocab">` + ln.v.map(w => { const v = B.vocab[w]; if(!v) return '';
      return `<span>${esc(w)}${v.r!==w?`（${esc(v.r)}）`:''}＝${esc(v.zh)} <em>${esc(vLabel(w))}</em></span>`; }).join('') + `</div>`;
  }
  if(ln.note) h += `<div class="small" style="margin-top:6px">💡 ${esc(ln.note)}</div>`;
  h += drillsHTML(ln.g);
  return h + `</div>`;
}
function addReview(d, i, why){
  const k = d.id + ':' + i; const r = S.review[k] || {n:0};
  r.n++; r.t = Date.now(); r.why = why; S.review[k] = r; save();
}
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toast._t); toast._t = setTimeout(()=>t.classList.add('hidden'), 1800); }
function updateChips(){
  $('#reviewCount').textContent = Object.keys(S.review).length;
  $('#speedBtn').textContent = (S.speed<1?'0.7':'1.0') + 'x';
  $('#speedBtn').classList.toggle('on', S.speed<1);
}
function lessonProgress(n){
  const ds = B.dialogues.filter(d=>d.l===n); const done = ds.filter(d=>S.done[d.id]).length;
  return {done, total: ds.length, pct: Math.round(done/ds.length*100)};
}
function shuffle(a){ a = a.slice(); for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

/* ---------------- side nav ---------------- */
function renderSide(cur){
  $('#side').innerHTML = `<a href="#/" class="${cur==='home'?'cur':''}">🏠 首頁</a><a href="#/review" class="${cur==='review'?'cur':''}">📝 複習清單（${Object.keys(S.review).length}）</a>` +
    B.lessons.map(l => { const p = lessonProgress(l.n); return `<a href="#/l/${l.n}" class="${cur===l.n?'cur':''}">第${l.n}課 ${esc(l.t)}<small>${esc(l.zh)}・${p.done}/${p.total} 完成</small></a>`; }).join('');
}

/* ---------------- views ---------------- */
function viewHome(){
  renderSide('home');
  const totalD = B.dialogues.length, doneD = B.dialogues.filter(d=>S.done[d.id]).length;
  $('#view').innerHTML = `
  <h1>文化日本語 第1～12課 聽力練習</h1>
  <p class="mute small">教材：《${esc(B.title)}》（文化外國語專門學校 編）。每課依課本頁序收錄「本文」原文與「文型」例句（皆標頁碼），最後是 2 段實用小對話，先「只聽不看」，再點開日文、中文。聽不懂就按「我不會」，會告訴你出自第幾課、哪個文型、課本第幾頁。每課也可以翻閱課本頁面複習。</p>
  <div class="row" style="margin:8px 0 14px">
    <a class="btn" href="#/l/1" style="text-decoration:none">從第1課開始</a>
    <a class="btn alt" href="#/review" style="text-decoration:none">📝 複習清單（${Object.keys(S.review).length}）</a>
    <span class="small mute">已完成對話 ${doneD}/${totalD}</span>
  </div>
  <div class="grid">${B.lessons.map(l => { const p = lessonProgress(l.n); const q = B.dialogues.filter(d=>d.l===l.n).map(d=>S.quiz[d.id]).filter(x=>x!=null);
    return `<a class="card" href="#/l/${l.n}"><div class="lnum">第${l.n}課 ${UNCERTAIN[l.n]?'<span class="badge u">部分推定</span>':''}</div><div class="ltitle">${esc(l.t)}</div><div class="small mute">${esc(l.zh)}</div><div class="small mute">${esc(l.topic)}</div>
    <div class="bar"><i style="width:${p.pct}%"></i></div><div class="small mute" style="margin-top:4px">${p.done}/${p.total} 對話${q.length?`・測驗最佳 ${Math.max(...q)}%`:''}</div></a>`; }).join('')}</div>
  <h2>📱 加到主畫面（離線也能複習）</h2>
  <div class="card small">
    <div><b>iPhone（Safari）</b>：點下方「分享」→「加入主畫面」。</div>
    <div><b>Galaxy Z Fold（Chrome / Samsung Internet）</b>：點右上「⋮」→「加到主畫面／安裝應用程式」。摺疊、展開都能用；展開時會變成左右兩欄。</div>
    <div><b>電腦（Chrome / Edge）</b>：網址列右側的「安裝」圖示，或直接用書籤。</div>
    <div class="mute" style="margin-top:4px">第一次開啟後，音檔會自動存到裝置，之後沒網路也能播放（可在 ⚙︎ 設定中檢查）。</div>
  </div>
  <div class="foot">出處說明：課名、本文、文型編號與頁碼皆依使用者提供的《文化初級日本語Ⅰ テキスト改訂版》課本 PDF 整理；標「課本原文」者為課本本文逐句收錄（註明頁碼），同文型聽力練習全部為課本文型例句與練習例（標頁碼）；標「實用會話」者為本 App 依該課及之前文型自編。單字中文參考官方語彙表（繁體中文）。語音為 AI 合成（非課本 CD），使用 VOICEVOX（VOICEVOX:No.7、VOICEVOX:冥鳴ひまり、VOICEVOX:玄野武宏、VOICEVOX:雀松朱司）。僅供個人學習使用。</div>
  <div style="text-align:right;margin:10px 0 4px"><a href="https://thwang40.github.io/jimtof-talk/" style="font-size:11px;color:#9aa0a6;text-decoration:none">展會會話 ›</a></div>`;
}

function viewLesson(n){
  const L = LESSON[n]; if(!L) return viewHome();
  renderSide(n); reveal = {};
  current = {type:'review', keys: FLOW[n].flatMap(d => d.lines.map((_,i)=>d.id+':'+i))};
  const gs = Object.entries(B.grammar).filter(([k,g])=>g.l===n);
  $('#view').innerHTML = `
  <div class="crumb"><a href="#/">首頁</a> › 第${n}課</div>
  <h1>第${n}課　${esc(L.t)}</h1>
  <div class="kana">${esc(L.r)}</div><div class="mute">${esc(L.zh)}・${esc(L.topic)}</div>
  ${UNCERTAIN[n]?`<div class="scene">⚠️ 注意：${esc(UNCERTAIN[n])}，其他文型已對照官方資料。</div>`:''}
  <div class="row" style="margin:6px 0"><span class="small mute">課本 p.${L.pages[0]}–${L.pages[1]}</span><a class="btn sm" style="text-decoration:none" href="#/p/${L.n}/0">📄 課本頁面（${L.pages[1]-L.pages[0]+1} 頁）</a></div>
  ${playerHTML()}
  <div class="small" id="nowPlaying" style="min-height:1.2em;margin:-4px 0 4px"></div>
  <div class="small mute" style="margin:0 0 8px">「全部播放」會依下面的順序（課本頁序 → 實用會話）一句一句播完整課。</div>
  ${n===1?`<h2>🌱 生活の言葉（第1課前，p.14–21）</h2><div class="dlist">${FLOW[0].map(fCard).join('')}</div>`:''}
  <h2>📖 課本內容（依課本頁序：本文＋文型）</h2>
  <div class="dlist">${FLOW[n].filter(d=>d.drill||isText(d)).map(fCard).join('')}</div>
  <h2>🎧 實用會話（依本課文型自編）</h2>
  <div class="dlist">${FLOW[n].filter(d=>!d.drill&&!isText(d)).map(fCard).join('')}</div>
  <div class="row" style="margin-top:10px"><a class="btn" style="text-decoration:none" href="#/q/L${n}">✏️ 第${n}課 聽力測驗</a></div>
  ${pagesSection(L)}
  <details ${gs.length<=0?'':''}><summary>📚 本課文型（${gs.length}）</summary><div class="gl">${gs.map(([k,g])=>gItemHTML(k,g)).join('')}</div></details>
  ${n===1?`<details><summary>📚 生活の言葉（第1課前）</summary><div class="gl">${Object.entries(B.grammar).filter(([k,g])=>g.l===0).map(([k,g])=>gItemHTML(k,g)).join('')}</div></details>`:''}
  <div class="row" style="margin-top:14px">${n>1?`<a class="btn ghost" style="text-decoration:none" href="#/l/${n-1}">‹ 第${n-1}課</a>`:''}${n<12?`<a class="btn ghost" style="text-decoration:none" href="#/l/${n+1}">第${n+1}課 ›</a>`:''}</div>`;
  bindPlayer();
}

function gItemHTML(k, g){ return `<div class="g"><b>${esc(gLabel(k))}</b><div class="ex">${esc(g.ex)}</div><div class="small mute">${esc(g.zh)}</div>${DRILL[k]?`<a class="btn sm ghost" style="text-decoration:none;margin-top:6px" href="#/g/${k}">🎧 同文型聽力練習（${DRILL[k].lines.length} 句）</a>`:''}</div>`; }
function viewDrill(k){
  const d = DRILL[k]; if(!d) return viewHome();
  const g = B.grammar[k], n = d.l, L = LESSON[n];
  renderSide(n || 1); reveal = {};
  current = {type:'dlg', d, idxs: d.lines.map((_,i)=>i)};
  $('#view').innerHTML = `
  <div class="crumb"><a href="#/">首頁</a> › ${L?`<a href="#/l/${n}">第${n}課 ${esc(L.t)}</a>`:`<a href="#/l/1">生活の言葉</a>`} › 同文型練習</div>
  <div class="small"><span class="badge txt">同文型聽力練習・課本例句（${d.lines.length} 句，皆標頁碼）</span></div>
  <h1>🎧 ${esc(gLabel(k))}</h1>
  <div class="scene">💡 ${esc(g.zh)}</div>
  ${playerHTML()}
  <div class="lines" id="lines">${d.lines.map((_,i)=>lineHTML(d,i)).join('')}</div>
  <div class="row" style="margin-top:14px">
    <a class="btn" style="text-decoration:none" href="#/q/${d.id}">✏️ 小測驗：聽到的是哪一句？／意思是？</a>
  </div>
  ${flowNavHTML(d)}`;
  bindPlayer();
}
function fCard(d){ if(!d.drill) return dCard(d); const k = d.drill, g = B.grammar[k];
  return `<a class="card" href="#/g/${k}"><div class="lnum"><span class="badge">${k[0]==='0'?'生活の言葉':'文型'}${esc(k.split('-')[1])}・p.${g.pg}</span> ${S.quiz[d.id]!=null?`<span class="badge">測驗 ${S.quiz[d.id]}%</span>`:''}</div><div class="ltitle">${esc(g.p)}</div><div class="small mute">課本例句 ${d.lines.length} 句</div></a>`; }
function dCard(d){ return `<a class="card" href="#/d/${d.id}"><div class="lnum">${d.src?`<span class="badge txt">${esc(d.src.label)}・p.${d.src.page}</span>`:`<span class="badge">實用會話 ${esc(d.id)}</span>`} ${S.done[d.id]?'<span class="badge">已聽完</span>':''} ${S.quiz[d.id]!=null?`<span class="badge">測驗 ${S.quiz[d.id]}%</span>`:''}</div><div class="ltitle">${esc(d.title)}</div><div class="small mute">${esc(d.scene)}（${d.lines.length} 句）</div></a>`; }
/* ---------------- textbook pages ---------------- */
const pageList = L => { const a=[]; for(let p=L.pages[0]; p<=L.pages[1]; p++) a.push(p); return a; };
const pageSrc = p => `pages/p${String(p).padStart(3,'0')}.webp`;
function pagesSection(L){
  const ps = pageList(L);
  return `<h2 id="pages">📄 課本頁面（p.${ps[0]}–${ps[ps.length-1]}，共 ${ps.length} 頁）</h2>
  <div class="row" style="margin-bottom:8px"><a class="btn" style="text-decoration:none" href="#/p/${L.n}/0">📖 翻頁瀏覽</a><button class="btn sm ghost" data-act="pgcache" data-l="${L.n}">⬇︎ 本課頁面存離線</button><span class="small mute" id="pgcInfo"></span></div>
  <div class="thumbs">${ps.map((p,i)=>`<a href="#/p/${L.n}/${i}" class="thumb"><img loading="lazy" decoding="async" src="${pageSrc(p)}" alt="第${L.n}課 課本 p.${p}" width="1200" height="1714"><span>p.${p}</span></a>`).join('')}</div>`;
}
let pv = null;
function viewPage(n, idx){
  const L = LESSON[n]; if(!L) return viewHome();
  const ps = pageList(L); idx = Math.max(0, Math.min(ps.length-1, idx|0)); const p = ps[idx];
  renderSide(n); current = null;
  pv = {n, idx, len: ps.length, zoom: (pv && pv.n===n) ? pv.zoom : 1};
  const prevL = LESSON[n-1], nextL = LESSON[n+1];
  $('#view').innerHTML = `
  <div class="crumb"><a href="#/">首頁</a> › <a href="#/l/${n}">第${n}課 ${esc(L.t)}</a> › 課本頁面</div>
  <div class="pvbar">
    <a class="btn sm ghost" href="${idx>0?`#/p/${n}/${idx-1}`:(prevL?`#/p/${n-1}/${pageList(prevL).length-1}`:'#/p/'+n+'/0')}" aria-label="上一頁" style="text-decoration:none">‹ 上一頁</a>
    <div class="pvlabel"><b>第${n}課・p.${p}</b><span class="small mute">（${idx+1} / ${ps.length}）</span></div>
    <a class="btn sm ghost" href="${idx<ps.length-1?`#/p/${n}/${idx+1}`:(nextL?`#/p/${n+1}/0`:'#/p/'+n+'/'+idx)}" aria-label="下一頁" style="text-decoration:none">下一頁 ›</a>
  </div>
  <div class="pvtools row"><div class="seg"><button data-z="1" class="${pv.zoom===1?'on':''}">符合寬度</button><button data-z="1.6" class="${pv.zoom===1.6?'on':''}">1.6×</button><button data-z="2.4" class="${pv.zoom===2.4?'on':''}">2.4×</button></div>
    <button class="btn sm ghost" id="pvFull">⛶ 全螢幕</button><a class="btn sm ghost" style="text-decoration:none" href="${pageSrc(p)}" target="_blank" rel="noopener">原圖</a></div>
  <div class="pvwrap" id="pvwrap"><img id="pvimg" width="1200" height="1714" src="${pageSrc(p)}" alt="第${n}課 課本 p.${p}" style="width:${pv.zoom*100}%"></div>
  <div class="small mute" style="margin-top:6px">左右滑動或按 ← → 翻頁；點兩下放大／縮小；手機也可以用兩指縮放。${idx===ps.length-1&&nextL?'下一頁會進入第'+(n+1)+'課。':''}</div>
  <div class="pvstrip">${ps.map((q,i)=>`<a href="#/p/${n}/${i}" class="${i===idx?'cur':''}">p.${q}</a>`).join('')}</div>`;
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
  if(!pv) return; const L = LESSON[pv.n]; const i = pv.idx + dir;
  if(i>=0 && i<pv.len) location.hash = `#/p/${pv.n}/${i}`;
  else if(i<0 && LESSON[pv.n-1]) location.hash = `#/p/${pv.n-1}/${pageList(LESSON[pv.n-1]).length-1}`;
  else if(i>=pv.len && LESSON[pv.n+1]) location.hash = `#/p/${pv.n+1}/0`;
}
document.addEventListener('keydown', e => { if(!location.hash.startsWith('#/p/')) return; if(e.key==='ArrowRight') flip(1); else if(e.key==='ArrowLeft') flip(-1); });
async function cacheLessonPages(n){
  if(!('caches' in window)) return toast('此瀏覽器不支援離線');
  const ps = pageList(LESSON[n]); const c = await caches.open('nh-pages-v1'); let k=0;
  for(const p of ps){ try{ if(!(await c.match(pageSrc(p)))) await c.add(pageSrc(p)); }catch(e){} k++; const el=$('#pgcInfo'); if(el) el.textContent=`${k}/${ps.length}`; }
  const el=$('#pgcInfo'); if(el) el.textContent='本課頁面已存離線 ✓';
}
let reveal = {}; // key -> level 0..2
function lineHTML(d, i, opts={}){
  const ln = d.lines[i]; const key = d.id+':'+i; const sp = d.sp[ln.s];
  const lv = S.listenFirst ? (reveal[key]||0) : 2;
  const inRev = !!S.review[key];
  return `<div class="line" data-key="${key}">
    <div class="lhead"><span class="spk ${ln.s}">${esc(sp.name)}</span><span class="small mute">${d.drill&&!opts.showId?`p.${ln.pg} ${esc(ln.tag||'')}・`:''}${opts.showId?`${d.drill?`文型${d.drill} p.${ln.pg}`:d.src?`第${d.l}課${d.src.label} p.${d.src.page}`:d.id}・`:''}第${i+1}句</span>
      <div class="lbtns"><button class="ibtn" data-act="play" data-d="${d.id}" data-i="${i}" aria-label="播放這句">🔊</button><button class="ibtn" data-act="rep" data-d="${d.id}" data-i="${i}" aria-label="重複三次">🔁</button></div></div>
    ${lv>=1?`<div class="ja">${esc(ln.ja)}</div>${S.showKana?`<div class="kana">${esc(ln.kana)}</div>`:''}`:`<button class="hiddenText" data-act="rv" data-k="${key}">👂 先聽聽看… 點這裡顯示日文</button>`}
    ${lv>=2?`<div class="zh">${esc(ln.zh)}</div>`:''}
    <div class="reveal-actions">
      ${lv===1?`<button class="btn sm ghost" data-act="rv" data-k="${key}">顯示中文</button>`:''}
      <button class="btn sm alt" data-act="idk" data-d="${d.id}" data-i="${i}">🙋 我不會</button>
      ${inRev && opts.review?`<button class="btn sm ok" data-act="got" data-k="${key}">✓ 我會了</button>`:''}
    </div>
    <div class="srcbox" id="src-${key.replace(':','_')}"></div>
  </div>`;
}
function playerHTML(){
  return `<div class="player"><div class="row">
    <button class="btn" id="playAllBtn">▶ 全部播放</button>
    <div class="seg" role="group" aria-label="速度"><button data-sp="0.7" class="${S.speed<1?'on':''}">0.7x</button><button data-sp="1" class="${S.speed>=1?'on':''}">1x</button></div>
    <div class="seg" role="group" aria-label="模式"><button data-mode="listen" class="${S.listenFirst?'on':''}">聽力優先</button><button data-mode="show" class="${!S.listenFirst?'on':''}">顯示全文</button></div>
  </div></div>`;
}
let current = null; // {type, d, idxs}
function viewDialogue(id){
  const d = DLG[id]; if(!d) return viewHome();
  renderSide(d.l); reveal = {};
  const L = LESSON[d.l]; const ds = B.dialogues.filter(x=>x.l===d.l); const pos = ds.indexOf(d);
  current = {type:'dlg', d, idxs: d.lines.map((_,i)=>i)};
  $('#view').innerHTML = `
  <div class="crumb"><a href="#/">首頁</a> › <a href="#/l/${d.l}">第${d.l}課 ${esc(L.t)}</a> › ${d.src?esc(d.src.label):'對話 '+d.id}</div>
  <div class="small"><span class="badge ${d.src?'txt':''}">${esc(srcTag(d))}</span></div>
  <h1>${esc(d.title)}</h1>
  <div class="scene">🎬 ${esc(d.scene)}</div>
  ${playerHTML()}
  <div class="lines" id="lines">${d.lines.map((_,i)=>lineHTML(d,i)).join('')}</div>
  <div class="row" style="margin-top:14px">
    <a class="btn" style="text-decoration:none" href="#/q/${d.id}">✏️ 這段的聽力測驗</a>
  </div>
  ${flowNavHTML(d)}`;
  bindPlayer();
}
function rerenderLine(d, i, opts){
  const key = d.id+':'+i; const el = document.querySelector(`.line[data-key="${key}"]`); if(!el) return;
  const box = el.querySelector('.srcbox').innerHTML;
  el.outerHTML = lineHTML(d, i, opts);
  const nel = document.querySelector(`.line[data-key="${key}"]`); nel.querySelector('.srcbox').innerHTML = box;
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
  document.querySelectorAll('.player [data-mode]').forEach(b => b.onclick = () => { S.listenFirst = b.dataset.mode==='listen'; save(); route(); });
}

/* review */
function viewReview(){
  renderSide('review');
  const keys = Object.keys(S.review).filter(k=>{ const [id,i]=k.split(':'); return DLG[id] && DLG[id].lines[+i]; })
    .sort((a,b)=>S.review[b].t - S.review[a].t);
  current = {type:'review', keys};
  reveal = {};
  $('#view').innerHTML = `
  <div class="crumb"><a href="#/">首頁</a> › 複習清單</div>
  <h1>📝 複習清單（${keys.length}）</h1>
  <p class="small mute">答錯或按「我不會」的句子會自動加進來。聽熟了就按「✓ 我會了」移除。</p>
  ${keys.length? playerHTML() + `<div class="row" style="margin:6px 0 10px"><a class="btn alt" style="text-decoration:none" href="#/q/review">✏️ 複習測驗</a></div>` : `<div class="card">目前沒有需要複習的句子 🎉</div>`}
  <div class="lines">${keys.map(k=>{ const [id,i]=k.split(':'); return lineHTML(DLG[id], +i, {review:true, showId:true}); }).join('')}</div>`;
  bindPlayer();
}

/* quiz */
let Q = null;
function buildQuiz(scope){
  let items = [];
  if(scope==='review') items = Object.keys(S.review).map(k=>{ const [id,i]=k.split(':'); return [DLG[id], +i]; }).filter(x=>x[0]&&x[0].lines[x[1]]);
  else if(scope[0]==='L'){ const n = +scope.slice(1); B.dialogues.filter(d=>d.l===n).forEach(d=>d.lines.forEach((ln,i)=>items.push([d,i]))); }
  else { const d = DLG[scope]; if(d) d.lines.forEach((ln,i)=>items.push([d,i])); }
  items = items.filter(([d,i]) => d.lines[i].ja.length >= 4);
  items = shuffle(items).slice(0, scope[0]==='L' ? 10 : 8);
  const pool = B.dialogues.flatMap(d => d.lines.map((ln,i)=>({d,i,ln})));
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
  else if(scope[0]==='L'){ const n=+scope.slice(1); back=`#/l/${n}`; backName=`第${n}課`; title=`第${n}課 聽力測驗`; renderSide(n); }
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
  <div class="row" style="margin-top:12px"><button class="btn" id="again">再測一次</button><a class="btn alt" style="text-decoration:none" href="#/review">📝 複習清單（${Object.keys(S.review).length}）</a><a class="btn ghost" style="text-decoration:none" href="${Q.back}">回到${esc(Q.backName)}</a></div></div>`;
  $('#again').onclick = () => viewQuiz(Q.scope);
}

/* ---------------- global clicks ---------------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if(!b) return;
  const act = b.dataset.act;
  if(act==='play'){ playLine(DLG[b.dataset.d], +b.dataset.i); }
  else if(act==='rep'){ playSeq(DLG[b.dataset.d], [+b.dataset.i], 900, 3); toast('重複 3 次'); }
  else if(act==='rv'){ const k = b.dataset.k; reveal[k] = Math.min(2,(reveal[k]||0)+1); const [id,i] = k.split(':'); rerenderLine(DLG[id], +i, current&&current.type==='review'?{review:true,showId:true}:{}); }
  else if(act==='idk'){
    const d = DLG[b.dataset.d], i = +b.dataset.i, k = d.id+':'+i;
    reveal[k] = 2; addReview(d, i, '我不會');
    rerenderLine(d, i, current&&current.type==='review'?{review:true,showId:true}:{});
    document.getElementById('src-'+k.replace(':','_')).innerHTML = srcHTML(d, i);
    toast('已加入複習清單');
  }
  else if(act==='drv'){ const el = b.closest('.dline'); const lv = Math.min(2, +el.dataset.lv + 1); el.dataset.lv = lv; el.querySelector('.dtext').innerHTML = drillTextHTML(DLG[el.dataset.d], +el.dataset.i, lv); }
  else if(act==='dall'){ const d = DLG[b.dataset.d]; if(curPlaying && curPlaying.startsWith(d.id+':')){ stopAll(); return; } playSeq(d, d.lines.map((_,i)=>i)); }
  else if(act==='spd'){ S.speed = +b.dataset.sp; save(); document.querySelectorAll('[data-sp],[data-qs]').forEach(x=>x.classList.toggle('on', +(x.dataset.sp||x.dataset.qs)===S.speed)); }
  else if(act==='pgcache'){ cacheLessonPages(+b.dataset.l); }
  else if(act==='got'){ delete S.review[b.dataset.k]; save(); toast('太棒了！已從複習清單移除'); viewReview(); }
});
$('#speedBtn').onclick = () => { S.speed = S.speed<1 ? 1 : 0.7; save(); toast('播放速度 '+(S.speed<1?'0.7x':'1x')); document.querySelectorAll('[data-sp],[data-qs]').forEach(x=>x.classList.toggle('on', +(x.dataset.sp||x.dataset.qs)===S.speed)); };
$('#settingsBtn').onclick = openSettings;
$('#sheet').addEventListener('click', e => { if(e.target.id==='sheet') closeSheet(); });
function closeSheet(){ $('#sheet').classList.add('hidden'); }
async function cacheStatus(){
  if(!('caches' in window)) return '此瀏覽器不支援離線快取';
  try{ const ks = await caches.keys(); let n=0; for(const k of ks){ const c = await caches.open(k); const r = await c.keys(); n += r.filter(x=>/\.mp3$/.test(x.url)).length; } return `已離線儲存音檔：${n} / ${B.dialogues.concat(Object.values(DRILL)).reduce((a,d)=>a+d.lines.length*2,0)}`; }catch(e){ return '無法讀取快取狀態'; }
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
    const urls = B.dialogues.concat(Object.values(DRILL)).flatMap(d=>d.lines.flatMap((_,i)=>[`audio/${d.id}_${i}.mp3`,`audio/${d.id}_${i}_s.mp3`]));
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
  else if(a==='p') viewPage(+b, +(h.split('/')[2]||0));
  else viewHome();
  updateChips(); window.scrollTo(0,0);
}
window.addEventListener('hashchange', route);
route();

if('serviceWorker' in navigator && location.protocol !== 'file:'){
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
})();
