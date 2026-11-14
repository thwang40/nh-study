#!/usr/bin/env node
'use strict';
const assert = require('assert');
const A = require('./sync-auth.js');

let n = 0;
function t(name, fn) { fn(); n++; console.log('ok  ' + name); }

t('parse id_token from hash', () => {
  const r = A.parseOAuthReturn('#id_token=abc.def.ghi&token_type=Bearer');
  assert.strictEqual(r.idToken, 'abc.def.ghi');
  assert.strictEqual(r.error, '');
});

t('parse error from query', () => {
  const r = A.parseOAuthReturn('?error=access_denied&error_description=User+denied');
  assert.strictEqual(r.idToken, '');
  assert.strictEqual(r.error, 'access_denied');
  assert.strictEqual(r.errorDescription, 'User denied');
});

t('decodeJwt + nonce from payload', () => {
  const payload = Buffer.from(JSON.stringify({ nonce: 'n1', email: 'a@b.c' })).toString('base64url');
  const token = 'eyJhbGciOiJub25lIn0.' + payload + '.sig';
  const r = A.parseOAuthReturn('id_token=' + token);
  assert.strictEqual(r.nonce, 'n1');
  assert.strictEqual(A.decodeJwt(token).email, 'a@b.c');
});

t('oauthRedirectUrl uses implicit id_token and our redirect_uri', () => {
  const u = new URL(A.oauthRedirectUrl(
    '677067855657-nut9t7uikmflcd8i2vaudr6hdajg3go0.apps.googleusercontent.com',
    'https://thwang40.github.io/nh-study/auth-callback.html',
    'nonce-1'
  ));
  assert.strictEqual(u.hostname, 'accounts.google.com');
  assert.strictEqual(u.searchParams.get('client_id').startsWith('677067855657-'), true);
  assert.strictEqual(u.searchParams.get('redirect_uri'), 'https://thwang40.github.io/nh-study/auth-callback.html');
  assert.strictEqual(u.searchParams.get('response_type'), 'id_token');
  assert.strictEqual(u.searchParams.get('nonce'), 'nonce-1');
  assert.strictEqual(u.searchParams.get('prompt'), 'select_account');
});

t('callbackUrlFromLocation for GitHub Pages path', () => {
  assert.strictEqual(
    A.callbackUrlFromLocation({ origin: 'https://thwang40.github.io', pathname: '/nh-study/' }),
    'https://thwang40.github.io/nh-study/auth-callback.html'
  );
  assert.strictEqual(
    A.callbackUrlFromLocation({ origin: 'https://thwang40.github.io', pathname: '/nh-study/index.html' }),
    'https://thwang40.github.io/nh-study/auth-callback.html'
  );
});

t('captureOAuthReturnFromLocation parks token and strips hash', () => {
  const store = { data: {}, setItem(k, v) { this.data[k] = v; } };
  const calls = [];
  const loc = { hash: '#id_token=TOK&authuser=0', search: '', pathname: '/nh-study/' };
  const _hist = global.history;
  global.history = { replaceState(a, b, u) { calls.push(u); } };
  try {
    const raw = A.captureOAuthReturnFromLocation(loc, store);
    assert.ok(raw.indexOf('id_token=TOK') === 0);
    assert.strictEqual(store.data['nhSync.oauthReturn'], raw);
    assert.deepStrictEqual(calls, ['/nh-study/#/']);
  } finally { global.history = _hist; }
});

t('zhAuthError: cancelled vs unauthorized-domain', () => {
  assert.strictEqual(A.zhAuthError({ code: 'auth/popup-closed-by-user' }), '已取消登入');
  const u = A.zhAuthError({ code: 'auth/unauthorized-domain' });
  assert.ok(u.indexOf('unauthorized-domain') !== -1);
  assert.ok(u.indexOf('登入沒有成功') === 0);
});

t('shouldFallbackToSameOrigin', () => {
  assert.strictEqual(A.shouldFallbackToSameOrigin({ code: 'auth/popup-blocked' }), true);
  assert.strictEqual(A.shouldFallbackToSameOrigin({ code: 'auth/popup-closed-by-user' }), false);
  assert.strictEqual(A.shouldFallbackToSameOrigin({ code: 'auth/internal-error', message: 'popup' }), true);
  assert.strictEqual(A.shouldFallbackToSameOrigin({ code: 'auth/unauthorized-domain' }), false);
});

console.log('\n' + n + ' tests passed');
