#!/usr/bin/env node
'use strict';
// 版本號一致性：app.js APP_VER、sw.js APP_VER、version.json、index.html 頂端列
const fs = require('fs'); const assert = require('assert');
const app = fs.readFileSync(__dirname + '/app.js', 'utf8'), sw = fs.readFileSync(__dirname + '/sw.js', 'utf8');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8'), vj = JSON.parse(fs.readFileSync(__dirname + '/version.json', 'utf8'));
const a = /const APP_VER = '([\d.]+)'/.exec(app)[1], s = /const APP_VER = '([\d.]+)'/.exec(sw)[1];
const shell = /const SHELL = '(nh-shell-v\d+)'/.exec(sw)[1], h = /id="hver">v([\d.]+)</.exec(html)[1];
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok  ' + name); };
t('app.js and sw.js APP_VER match', () => assert.strictEqual(a, s));
t('version.json v matches', () => assert.strictEqual(vj.v, a));
t('version.json sw matches SHELL', () => assert.strictEqual(vj.sw, shell));
t('index.html header version matches', () => assert.strictEqual(h, a));
t('audio cache stays nh-audio-v9', () => assert.ok(/AUDIO = 'nh-audio-v9'/.test(sw)));
t('LS_KEY unchanged', () => assert.ok(/LS_KEY = 'bunkaListen\.v2'/.test(app)));
console.log(n + ' tests passed');
