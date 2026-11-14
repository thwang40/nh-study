/* 撿角日語 — 可選的 Google 登入＋Firestore 同步複習清單與進度。
   只有 window.FB_CONFIG 有值時才會出現登入 UI，並在需要時才從 gstatic CDN 載入 Firebase JS SDK。
   不登入、離線、或設定為 null 時，行為與原本完全相同。 */
(function (root) {
  'use strict';
  const FB_VER = '12.4.0';
  const FB_BASE = 'https://www.gstatic.com/firebasejs/' + FB_VER;
  const DEBOUNCE_MS = 1200;
  const TZ_LABEL = '台北時間';

  let mods = null;      // { initializeApp, getAuth, ... }
  let app = null, auth = null, db = null;
  let user = null;      // Firebase User or preview {email,displayName,photoURL,uid}
  let lastSynced = 0;
  let syncing = false;
  let pending = false;
  let debounceT = 0;
  let applying = false;
  let errMsg = '';
  let started = false;

  function config() { return root.FB_CONFIG || null; }
  function configReady() {
    const c = config();
    return !!(c && typeof c === 'object' && c.apiKey && c.projectId && c.authDomain);
  }
  function isPreview() {
    const c = config();
    return !!(c && c._preview);
  }
  function previewUser() {
    const p = config() && config()._preview;
    if (p && typeof p === 'object') return p;
    return null;
  }
  function getS() { return root.NhApp && root.NhApp.S; }
  function appSave(quiet) {
    if (!root.NhApp || !root.NhApp.save) return;
    if (quiet) root.NhApp.save._quiet = true;
    try { root.NhApp.save(); } finally { if (quiet) root.NhApp.save._quiet = false; }
  }
  function toast(msg) { if (root.NhApp && root.NhApp.toast) root.NhApp.toast(msg); }

  function isIOS() {
    const ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function isStandalone() {
    return navigator.standalone === true || (root.matchMedia && root.matchMedia('(display-mode: standalone)').matches);
  }
  function preferRedirect() { return isIOS() && isStandalone(); }

  function pad(n) { return String(n).padStart(2, '0'); }
  function fmtSyncTime(ts) {
    if (!ts) return '尚未同步';
    const d = Date.now() - ts;
    if (d < 45 * 1000) return '剛才';
    if (d < 3600 * 1000) return Math.max(1, Math.floor(d / 60000)) + ' 分鐘前';
    const dt = new Date(ts);
    return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()) + ' ' +
      pad(dt.getHours()) + ':' + pad(dt.getMinutes()) + '（' + TZ_LABEL + '）';
  }
  function esc(s) { return root.NhApp && root.NhApp.esc ? root.NhApp.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  async function loadSDK() {
    if (mods) return mods;
    const [appMod, authMod, fsMod] = await Promise.all([
      import(FB_BASE + '/firebase-app.js'),
      import(FB_BASE + '/firebase-auth.js'),
      import(FB_BASE + '/firebase-firestore.js')
    ]);
    mods = { ...appMod, ...authMod, ...fsMod };
    return mods;
  }

  async function initFirebase() {
    if (db) return;
    const c = config();
    const m = await loadSDK();
    app = m.initializeApp(c);
    auth = m.getAuth(app);
    try { await m.setPersistence(auth, m.browserLocalPersistence); } catch (e) {}
    try {
      db = m.initializeFirestore(app, {
        localCache: m.persistentLocalCache({ tabManager: m.persistentMultipleTabManager() })
      });
    } catch (e) {
      db = m.getFirestore(app);
    }
  }

  function userRef() {
    if (!db || !user || !user.uid) return null;
    return mods.doc(db, 'users', user.uid);
  }

  function packedForCloud(packed) {
    // Firestore rejects undefined; keep only the progress maps + timestamps.
    return {
      review: packed.review || {},
      unf: packed.unf || {},
      done: packed.done || {},
      quiz: packed.quiz || {},
      updatedAt: packed.updatedAt || Date.now(),
      syncedAt: Date.now()
    };
  }

  async function syncNow(reason) {
    if (!configReady() || isPreview()) return;
    if (!user || !user.uid) return;
    if (applying) return;
    if (syncing) { pending = true; return; }
    const S = getS();
    if (!S || !root.SyncMerge) return;
    syncing = true;
    errMsg = '';
    refreshPanels();
    try {
      const ref = userRef();
      const merged = await mods.runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        const cloud = snap.exists() ? snap.data() : root.SyncMerge.emptyPacked();
        const out = root.SyncMerge.merge(root.SyncMerge.packLocal(S), cloud);
        const doc = packedForCloud(out);
        tx.set(ref, doc);
        return out;
      });
      applying = true;
      try {
        root.SyncMerge.applyToLocal(S, merged);
        appSave(true);
      } finally { applying = false; }
      lastSynced = Date.now();
      pending = false;
    } catch (e) {
      pending = true;
      errMsg = (e && (e.message || e.code)) ? String(e.message || e.code) : '同步失敗';
      // 離線時 Firestore 會把寫入排進本機佇列；先不要一直跳出錯誤。
      if (!navigator.onLine) errMsg = '';
      else if (!/offline|unavailable|network|Failed to get document/i.test(errMsg)) {
        /* keep errMsg for the panel */
      }
    } finally {
      syncing = false;
      refreshPanels();
      if (pending && navigator.onLine) {
        pending = false;
        setTimeout(() => syncNow('retry'), 800);
      }
    }
  }

  function notifyLocalChange() {
    if (!configReady() || isPreview()) return;
    if (!user || applying) return;
    pending = true;
    clearTimeout(debounceT);
    debounceT = setTimeout(() => { if (navigator.onLine !== false) syncNow('change'); }, DEBOUNCE_MS);
  }

  async function signIn() {
    errMsg = '';
    refreshPanels();
    try {
      await initFirebase();
      const provider = new mods.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      if (preferRedirect()) {
        await mods.signInWithRedirect(auth, provider);
        return;
      }
      try {
        await mods.signInWithPopup(auth, provider);
      } catch (e) {
        const code = (e && e.code) || '';
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') throw e;
        if (code === 'auth/popup-blocked' ||
            code === 'auth/operation-not-supported-in-this-environment' ||
            /popup/i.test(code + ' ' + ((e && e.message) || ''))) {
          await mods.signInWithRedirect(auth, provider);
          return;
        }
        throw e;
      }
    } catch (e) {
      const code = (e && e.code) || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      errMsg = '登入沒有成功' + (code ? '（' + code.replace(/^auth\//, '') + '）' : '，請再試一次');
      refreshPanels();
    }
  }

  async function signOutUser() {
    try {
      if (auth && mods) await mods.signOut(auth);
    } catch (e) {}
    user = null;
    lastSynced = 0;
    errMsg = '';
    refreshPanels();
    toast('已登出。複習清單仍留在這台裝置上。');
  }

  function panelHTML(where) {
    if (!configReady()) return '';
    const who = user || previewUser();
    if (!who) {
      return `<div class="card sync-card" data-sync-panel="${esc(where)}">
        <button type="button" class="btn alt sm sync-btn-login" data-sync-act="in">☁️ 用 Google 登入同步複習</button>
        ${errMsg ? `<div class="sync-err">${esc(errMsg)}</div>` : ''}
        <div class="small mute" style="margin-top:6px">登入同一個 Google 帳號，複習清單與進度會在各裝置之間合併；不登入則只存在這台裝置。</div>
      </div>`;
    }
    const name = who.displayName || who.email || '已登入';
    const mail = who.email && who.displayName ? who.email : '';
    const photo = who.photoURL
      ? `<img class="sync-av" alt="" src="${esc(who.photoURL)}" referrerpolicy="no-referrer">`
      : `<span class="sync-av sync-av-fallback" aria-hidden="true">☁</span>`;
    const st = syncing ? '同步中…' : (pending && !navigator.onLine ? '離線，連上網路後會自動同步' : ('上次同步：' + fmtSyncTime(lastSynced)));
    return `<div class="card sync-card" data-sync-panel="${esc(where)}">
      <div class="sync-row">${photo}
        <div class="sync-meta"><b>${esc(name)}</b>${mail ? `<span>${esc(mail)}</span>` : ''}<span data-sync-st>${esc(st)}</span></div>
      </div>
      ${errMsg ? `<div class="sync-err">${esc(errMsg)}</div>` : ''}
      <div class="sync-actions">
        <button type="button" class="btn sm" data-sync-act="now" ${syncing ? 'disabled' : ''}>立即同步</button>
        <button type="button" class="btn sm ghost" data-sync-act="out">登出</button>
      </div>
    </div>`;
  }

  function bindPanel(scope) {
    const rootEl = scope || document;
    rootEl.querySelectorAll('[data-sync-act]').forEach(b => {
      if (b.dataset.bound) return;
      b.dataset.bound = '1';
      b.addEventListener('click', ev => {
        ev.preventDefault();
        const act = b.dataset.syncAct;
        if (act === 'in') signIn();
        else if (act === 'out') signOutUser();
        else if (act === 'now') syncNow('manual');
      });
    });
  }

  function refreshPanels() {
    document.querySelectorAll('[data-sync-panel]').forEach(el => {
      const where = el.getAttribute('data-sync-panel') || 'home';
      const wrap = document.createElement('div');
      wrap.innerHTML = panelHTML(where);
      const next = wrap.firstElementChild;
      if (next) { el.replaceWith(next); bindPanel(next.parentNode || document); }
    });
  }

  function onAuth(u) {
    user = u || null;
    refreshPanels();
    if (user) {
      toast('已登入，正在同步複習清單…');
      syncNow('login');
    }
  }

  async function start() {
    if (started) return;
    started = true;
    if (!configReady()) return;
    // app.js already called route() before this file ran; re-render once so the login card appears before first paint.
    if (root.NhApp && typeof root.NhApp.route === 'function') root.NhApp.route();
    bindPanel(document);
    if (isPreview()) {
      user = previewUser();
      if (user) lastSynced = Date.now();
      refreshPanels();
      return;
    }
    try {
      await initFirebase();
    } catch (e) {
      errMsg = '無法連到同步服務，請稍後再試';
      refreshPanels();
      return;
    }
    try {
      const cred = await mods.getRedirectResult(auth);
      if (cred && cred.user) { /* onAuthStateChanged will also fire */ }
    } catch (e) {
      const code = (e && e.code) || '';
      if (code !== 'auth/popup-closed-by-user') {
        errMsg = '登入沒有成功，請再試一次';
        refreshPanels();
      }
    }
    mods.onAuthStateChanged(auth, u => onAuth(u));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && user) syncNow('visible');
    });
    root.addEventListener('online', () => { if (user) syncNow('online'); });
    root.addEventListener('pageshow', () => { if (user) syncNow('pageshow'); });
  }

  root.NhSync = {
    notifyLocalChange,
    syncNow,
    panelHTML,
    bindPanel,
    refreshPanels,
    configReady,
    isSignedIn: () => !!user,
    start
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
