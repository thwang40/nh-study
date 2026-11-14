/* 撿角日語 — Google 登入輔助（純函式，Node 測試與瀏覽器共用）。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SyncAuth = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function decodeJwt(token) {
    try {
      const parts = String(token || '').split('.');
      if (parts.length < 2) return null;
      let p = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (p.length % 4) p += '=';
      const json = typeof atob === 'function'
        ? atob(p)
        : Buffer.from(p, 'base64').toString('utf8');
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  function parseOAuthReturn(raw) {
    raw = String(raw || '').replace(/^[#?]/, '');
    const sp = new URLSearchParams(raw);
    const idToken = sp.get('id_token') || '';
    const error = sp.get('error') || '';
    const errorDescription = (sp.get('error_description') || '').replace(/\+/g, ' ');
    let nonce = '';
    if (idToken) {
      const payload = decodeJwt(idToken);
      if (payload && payload.nonce) nonce = String(payload.nonce);
    }
    return { idToken, error, errorDescription, nonce };
  }

  /* Capture an implicit-flow return from the current URL (hash or query) and
     park it in sessionStorage, then strip it so the app hash router is not confused.
     Returns the raw string if captured, otherwise ''. */
  function captureOAuthReturnFromLocation(loc, store) {
    loc = loc || (typeof location !== 'undefined' ? location : null);
    if (!loc) return '';
    const h = String(loc.hash || '').replace(/^#/, '');
    const q = String(loc.search || '').replace(/^\?/, '');
    const look = s => /(?:^|&)(id_token|error)=/.test(s);
    const src = look(h) ? h : (look(q) ? q : '');
    if (!src) return '';
    try { if (store) store.setItem('nhSync.oauthReturn', src); } catch (e) {}
    try {
      if (typeof history !== 'undefined' && loc.pathname != null) {
        history.replaceState(null, '', loc.pathname + '#/');
      }
    } catch (e) {}
    return src;
  }

  function oauthRedirectUrl(clientId, redirectUri, nonce) {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'id_token',
      scope: 'openid email profile',
      nonce: nonce,
      prompt: 'select_account'
    });
    return 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
  }

  function callbackUrlFromLocation(loc) {
    loc = loc || (typeof location !== 'undefined' ? location : null);
    if (!loc) return '';
    const origin = loc.origin || (loc.protocol + '//' + loc.host);
    let path = String(loc.pathname || '/').replace(/index\.html$/, '');
    if (!path.endsWith('/')) path += '/';
    return origin + path + 'auth-callback.html';
  }

  function zhAuthError(e, fallback) {
    const code = (e && (e.code || e.error)) || '';
    const short = String(code).replace(/^auth\//, '');
    const map = {
      'popup-closed-by-user': '已取消登入',
      'cancelled-popup-request': '已取消登入',
      'popup-blocked': '彈出視窗被擋住',
      'unauthorized-domain': '這個網址尚未獲授權（unauthorized-domain）',
      'network-request-failed': '網路連線失敗，請檢查網路後再試',
      'user-disabled': '這個帳號已被停用',
      'invalid-credential': '登入憑證無效，請再試一次',
      'internal-error': '登入服務暫時發生問題，請再試一次',
      'operation-not-supported-in-this-environment': '這個環境不支援彈出登入',
      'access_denied': '已取消登入',
      'immediate_failed': '登入沒有完成，請再試一次'
    };
    if (short === 'popup-closed-by-user' || short === 'cancelled-popup-request' || short === 'access_denied') {
      return map[short];
    }
    if (map[short]) return '登入沒有成功：' + map[short] + (short && !map[short].includes(short) ? '（' + short + '）' : '');
    if (short) return '登入沒有成功：' + (fallback || short);
    return fallback || '登入沒有成功，請再試一次';
  }

  function isCancelled(e) {
    const code = (e && e.code) || '';
    return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
  }

  function shouldFallbackToSameOrigin(e) {
    const code = (e && e.code) || '';
    const msg = ((e && e.message) || '') + '';
    if (isCancelled(e)) return false;
    return code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment' ||
      /popup|third[- ]?party|storage partition|csp|blocked/i.test(code + ' ' + msg);
  }

  return {
    decodeJwt, parseOAuthReturn, captureOAuthReturnFromLocation,
    oauthRedirectUrl, callbackUrlFromLocation, zhAuthError, isCancelled, shouldFallbackToSameOrigin
  };
});
