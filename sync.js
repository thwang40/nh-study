/* 撿角日語 — 可選的 Google 登入＋Firestore 同步複習清單與進度。
   只有 window.FB_CONFIG 有值時才會出現登入 UI，並在需要時才從 gstatic CDN 載入 Firebase JS SDK。
   不登入、離線、或設定為 null 時，行為與原本完全相同。

   登入方式（避開 Safari ITP 對跨來源 authDomain 的限制）：
   1. 一律用 signInWithPopup（含 iOS 主畫面 PWA；必須在 click 裡同步呼叫，中間不可 await）
   2. 彈出視窗被擋時，改走同源 OAuth implicit（redirect_uri 在 thwang40.github.io），
      再用 GoogleAuthProvider.credential(idToken) + signInWithCredential。
   不用 signInWithRedirect（authDomain 在 firebaseapp.com，Safari 會擋第三方儲存，
   getRedirectResult 常回 null，看起來像沒登入）。
*/
(function (root) {
  'use strict';
  const FB_VER = '12.4.0';
  const FB_BASE = 'https://www.gstatic.com/firebasejs/' + FB_VER;
  const DEBOUNCE_MS = 1200;
  const TZ_LABEL = '台北時間';
  const SA = root.SyncAuth || {};

  let mods = null;
  let app = null, auth = null, db = null;
  let user = null;
  let lastSynced = 0;
  let syncing = false;
  let pending = false;
  let debounceT = 0;
  let localGen = 0; // bumps on every local save; detects edits made during a sync
  let applying = false;
  let errMsg = '';
  let started = false;
  let authReady = false;

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
  function toast(msg, ms) {
    if (root.NhApp && root.NhApp.toast) root.NhApp.toast(msg);
    if (ms && ms > 1800) {
      const t = document.getElementById('toast');
      if (t && root.NhApp && root.NhApp.toast) {
        clearTimeout(root.NhApp.toast._t);
        root.NhApp.toast._t = setTimeout(() => t.classList.add('hidden'), ms);
      }
    }
  }
  function logErr(msg, e) {
    try { console.warn('[撿角同步]', msg, e && (e.code || e.message || e)); } catch (x) {}
  }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function ssDel(k) { try { sessionStorage.removeItem(k); } catch (e) {} }

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
  function zh(e, fb) { return (SA.zhAuthError ? SA.zhAuthError(e, fb) : (fb || '登入沒有成功，請再試一次')); }

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
    if (auth && db) return;
    const c = config();
    const m = await loadSDK();
    if (!app) app = m.initializeApp(c);
    if (!auth) {
      try {
        auth = m.initializeAuth(app, {
          persistence: [m.indexedDBLocalPersistence, m.browserLocalPersistence],
          popupRedirectResolver: m.browserPopupRedirectResolver
        });
      } catch (e) {
        auth = m.getAuth(app);
        try { await m.setPersistence(auth, m.indexedDBLocalPersistence); }
        catch (e2) {
          try { await m.setPersistence(auth, m.browserLocalPersistence); } catch (e3) {}
        }
      }
    }
    if (!db) {
      try {
        db = m.initializeFirestore(app, {
          localCache: m.persistentLocalCache({ tabManager: m.persistentMultipleTabManager() })
        });
      } catch (e) {
        db = m.getFirestore(app);
      }
    }
  }

  function userRef() {
    if (!db || !user || !user.uid) return null;
    return mods.doc(db, 'users', user.uid);
  }

  function packedForCloud(packed) {
    const doc = {
      review: packed.review || {},
      unf: packed.unf || {},
      done: packed.done || {},
      quiz: packed.quiz || {},
      updatedAt: packed.updatedAt || Date.now(),
      syncedAt: Date.now()
    };
    if (packed.mine && Object.keys(packed.mine).length) doc.mine = packed.mine;   // 我的單語（v3.39）
    if (packed.marks && Object.keys(packed.marks).length) doc.marks = packed.marks;   // 🏷 時間註記（v3.42）
    return doc;
  }
  // 我的單語：app.js 提供 window.NhMine = { store(), save(quiet), refresh() }
  function mineApi() { return root.NhMine && root.SyncMerge && root.SyncMerge.packMine ? root.NhMine : null; }
  // 🏷 時間註記：app.js 提供 window.NhMarks = { store(), save(quiet) }
  function marksApi() { return root.NhMarks && root.SyncMerge && root.SyncMerge.packMarks ? root.NhMarks : null; }
  function packAll(S) {
    const p = root.SyncMerge.packLocal(S);
    const M = mineApi(); if (M) p.mine = root.SyncMerge.packMine(M.store());
    const K = marksApi(); if (K) p.marks = root.SyncMerge.packMarks(K.store());
    return p;
  }

  async function syncNow(reason) {
    if (!configReady() || isPreview()) return;
    if (!user || !user.uid) return;
    if (applying) return;
    if (syncing) { pending = true; return; }
    const S = getS();
    if (!S || !root.SyncMerge) return;
    syncing = true;
    const genAtStart = localGen;
    errMsg = '';
    refreshPanels();
    try {
      const ref = userRef();
      const merged = await mods.runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        const cloud = snap.exists() ? snap.data() : root.SyncMerge.emptyPacked();
        const out = root.SyncMerge.merge(packAll(S), cloud);
        const doc = packedForCloud(out);
        tx.set(ref, doc);
        return out;
      });
      applying = true;
      let changedDuring = false;
      try {
        // A tap (e.g. 🙋 加入複習) during the transaction changed S after it was packed: keep it.
        changedDuring = localGen !== genAtStart;
        const finalState = changedDuring ? root.SyncMerge.rebase(S, merged) : merged;
        const M = mineApi();
        if (M && changedDuring) finalState.mine = root.SyncMerge.mergeMine(root.SyncMerge.packMine(M.store()), merged.mine);
        const K = marksApi();
        if (K && changedDuring) finalState.marks = root.SyncMerge.mergeMarks(root.SyncMerge.packMarks(K.store()), merged.marks);
        const sigK = () => (K ? '#' + root.SyncMerge.marksSig(K.store()) : '');
        const before = root.SyncMerge.visibleSig(S) + '#' + (M ? root.SyncMerge.mineSig(M.store()) : '') + sigK();
        root.SyncMerge.applyToLocal(S, finalState);
        if (M && finalState.mine) { root.SyncMerge.applyMine(M.store(), finalState.mine); M.save(true); }
        if (K && finalState.marks) { root.SyncMerge.applyMarks(K.store(), finalState.marks); K.save(true); }
        appSave(true);
        const after = root.SyncMerge.visibleSig(S) + '#' + (M ? root.SyncMerge.mineSig(M.store()) : '') + sigK();
        // Only re-render when the cloud actually brought something new; keeps revealed text and open 出處 panels.
        if (before !== after && root.NhApp && typeof root.NhApp.refreshView === 'function') root.NhApp.refreshView();
        else if (root.NhApp && typeof root.NhApp.updateChips === 'function') root.NhApp.updateChips();
      } finally { applying = false; }
      lastSynced = Date.now();
      pending = changedDuring;
    } catch (e) {
      pending = true;
      errMsg = (e && (e.message || e.code)) ? String(e.message || e.code) : '同步失敗';
      if (!navigator.onLine) errMsg = '';
      else if (!/offline|unavailable|network|Failed to get document/i.test(errMsg)) {
        /* keep errMsg */
      }
      logErr('syncNow failed (' + (reason || '') + ')', e);
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
    localGen++;
    if (!configReady() || isPreview()) return;
    if (!user || applying) return;
    pending = true;
    clearTimeout(debounceT);
    debounceT = setTimeout(() => { if (navigator.onLine !== false) syncNow('change'); }, DEBOUNCE_MS);
  }

  function startSameOriginOAuth() {
    const clientId = (config() && config().googleClientId) || '';
    if (!clientId) {
      errMsg = '登入沒有成功：彈出視窗無法使用。請再試一次，或用 Safari 打開此頁後再登入。';
      toast(errMsg, 3600);
      refreshPanels();
      logErr('same-origin OAuth: missing googleClientId');
      return;
    }
    const redirectUri = SA.callbackUrlFromLocation ? SA.callbackUrlFromLocation(location) : (location.origin + location.pathname.replace(/[^/]+$/, '') + 'auth-callback.html');
    const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    ssSet('nhSync.oauthNonce', nonce);
    ssSet('nhSync.authPending', 'oauth');
    const url = SA.oauthRedirectUrl(clientId, redirectUri, nonce);
    logErr('fallback to same-origin OAuth', redirectUri);
    toast('改用另一種登入方式，即將前往 Google…', 2500);
    location.href = url;
  }

  /* Must be called synchronously from the click handler — no await before signInWithPopup
     (iOS 16.4+ home-screen PWA keeps the user gesture only if the popup opens immediately). */
  function signIn() {
    errMsg = '';
    refreshPanels();
    if (isPreview()) return;
    if (!auth || !mods) {
      errMsg = '同步服務還沒準備好，請再按一次登入';
      toast(errMsg, 2800);
      refreshPanels();
      logErr('signIn before Firebase init');
      initFirebase().then(() => {
        errMsg = '';
        toast('已經準備好，請再按一次「用 Google 登入同步複習」', 3200);
        refreshPanels();
      }).catch(e => {
        logErr('initFirebase from signIn', e);
        errMsg = zh(e, '無法連到同步服務，請稍後再試');
        toast(errMsg, 3600);
        refreshPanels();
      });
      return;
    }
    const provider = new mods.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    let p;
    try {
      p = mods.signInWithPopup(auth, provider, mods.browserPopupRedirectResolver);
    } catch (e) {
      logErr('signInWithPopup threw', e);
      startSameOriginOAuth();
      return;
    }
    ssSet('nhSync.authPending', 'popup');
    toast('正在打開 Google 登入…');
    p.then(cred => {
      ssDel('nhSync.authPending');
      if (cred && cred.user) ssSet('nhSync.justSignedIn', '1');
    }).catch(e => {
      logErr('signInWithPopup failed', e);
      ssDel('nhSync.authPending');
      if (SA.isCancelled && SA.isCancelled(e)) {
        toast('已取消登入');
        errMsg = '';
        refreshPanels();
        return;
      }
      if (SA.shouldFallbackToSameOrigin && SA.shouldFallbackToSameOrigin(e)) {
        toast('彈出視窗無法使用，改用另一種登入方式…', 2500);
        startSameOriginOAuth();
        return;
      }
      errMsg = zh(e);
      toast(errMsg, 4000);
      refreshPanels();
    });
  }

  async function consumeOAuthReturn() {
    let raw = ssGet('nhSync.oauthReturn') || '';
    if (!raw && SA.captureOAuthReturnFromLocation) {
      raw = SA.captureOAuthReturnFromLocation(location, sessionStorage) || ssGet('nhSync.oauthReturn') || '';
    }
    if (!raw) return false;
    ssDel('nhSync.oauthReturn');
    const parsed = SA.parseOAuthReturn ? SA.parseOAuthReturn(raw) : { idToken: '', error: 'parse' };
    if (parsed.error && !parsed.idToken) {
      const fake = { code: parsed.error, message: parsed.errorDescription };
      errMsg = zh(fake, parsed.errorDescription || parsed.error);
      if (errMsg !== '已取消登入') toast(errMsg, 4000);
      else toast('已取消登入');
      refreshPanels();
      logErr('OAuth return error', parsed);
      ssDel('nhSync.authPending');
      return true;
    }
    if (!parsed.idToken) return false;
    const expected = ssGet('nhSync.oauthNonce');
    if (expected && parsed.nonce && parsed.nonce !== expected) {
      errMsg = '登入沒有成功：驗證碼不符，請再試一次';
      toast(errMsg, 4000);
      logErr('OAuth nonce mismatch');
      ssDel('nhSync.authPending');
      return true;
    }
    try {
      const cred = mods.GoogleAuthProvider.credential(parsed.idToken);
      await mods.signInWithCredential(auth, cred);
      ssDel('nhSync.authPending');
      ssSet('nhSync.justSignedIn', '1');
      return true;
    } catch (e) {
      logErr('signInWithCredential failed', e);
      errMsg = zh(e);
      toast(errMsg, 4000);
      refreshPanels();
      ssDel('nhSync.authPending');
      return true;
    }
  }

  async function signOutUser() {
    try {
      if (auth && mods) await mods.signOut(auth);
    } catch (e) { logErr('signOut', e); }
    user = null;
    lastSynced = 0;
    errMsg = '';
    refreshPanels();
    toast('已登出。複習清單仍留在這台裝置上。', 3200);
  }

  function panelHTML(where) {
    if (!configReady()) return '';
    const who = user || previewUser();
    if (!who) {
      return `<div class="card sync-card" data-sync-panel="${esc(where)}">
        <button type="button" class="btn alt sm sync-btn-login" data-sync-act="in">☁️ 用 Google 登入同步複習</button>
        ${errMsg ? `<div class="sync-err">${esc(errMsg)}</div>` : ''}
        <div class="small mute" style="margin-top:6px">登入同一個 Google 帳號，複習清單與進度會在各裝置之間合併；不登入則只存在這台裝置。登入成功後會顯示你的帳號。</div>
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
    const prev = user;
    user = u || null;
    refreshPanels();
    const just = ssGet('nhSync.justSignedIn') === '1';
    if (just) ssDel('nhSync.justSignedIn');
    if (user && (just || (authReady && !prev))) {
      toast('登入成功' + (user.email ? '（' + user.email + '）' : '') + '，正在同步複習清單…', 3600);
      syncNow('login');
    } else if (user && !authReady) {
      syncNow('resume');
    }
    authReady = true;
  }

  async function start() {
    if (started) return;
    started = true;
    if (!configReady()) return;
    if (SA.captureOAuthReturnFromLocation) {
      try { SA.captureOAuthReturnFromLocation(location, sessionStorage); } catch (e) {}
    }
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
      logErr('initFirebase', e);
      errMsg = '無法連到同步服務，請稍後再試';
      toast(errMsg, 3600);
      refreshPanels();
      return;
    }
    try {
      await consumeOAuthReturn();
    } catch (e) { logErr('consumeOAuthReturn', e); }
    try {
      // Still check, in case a v3.10 signInWithRedirect is mid-flight.
      const cred = await mods.getRedirectResult(auth, mods.browserPopupRedirectResolver);
      if (cred && cred.user) ssSet('nhSync.justSignedIn', '1');
    } catch (e) {
      logErr('getRedirectResult', e);
      const code = (e && e.code) || '';
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        /* Don't overwrite a more specific OAuth error. */
        if (!errMsg) {
          errMsg = zh(e, '登入沒有成功，請再試一次');
          toast(errMsg, 4000);
          refreshPanels();
        }
      }
    }
    if (ssGet('nhSync.authPending') === 'oauth' && !ssGet('nhSync.justSignedIn') && !(auth && auth.currentUser)) {
      errMsg = '登入沒有成功：沒有收到 Google 的登入結果，請再按一次。';
      toast(errMsg, 4000);
      logErr('oauth pending but no credential');
      ssDel('nhSync.authPending');
      refreshPanels();
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
