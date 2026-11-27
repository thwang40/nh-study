/* 我的單語（v3.39）共用核心：動詞變化（App 與 bake_mine.py 透過 node 共用，結果一致）。
   不碰 localStorage；資料存放見 app.js（nhStudy.mine）與 sync-merge.js（packMine / applyMine）。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MineCore = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const LAB = {
    dict: '辭書形（普通・肯定）', nai: 'ない形（普通・否定）', ta: 'た形（普通・過去）', nakatta: 'なかった形（普通・過去否定）',
    masu: 'ます形（禮貌）', masen: 'ません（禮貌・否定）', mashita: 'ました（禮貌・過去）', masendeshita: 'ませんでした（禮貌・過去否定）',
    mashou: 'ましょう（邀約）', te: 'て形', teiru: 'ている（進行・狀態）', tai: 'たい（想要～）', vol: '意向形（～吧）',
    pot: '可能形（能夠～）', ba: 'ば形（假定・如果～）', imp: '命令形', proh: '禁止形（不准～）', passive: '受身形（被～）',
    caus: '使役形（讓～）', causpass: '使役受身形（被迫～）'
  };
  const ORDER = ['dict', 'nai', 'ta', 'nakatta', 'masu', 'masen', 'mashita', 'masendeshita', 'mashou', 'te', 'teiru', 'tai', 'vol', 'pot', 'ba', 'imp', 'proh', 'passive', 'caus', 'causpass'];
  const BASIC = ['dict', 'nai', 'ta', 'nakatta', 'masu', 'masen', 'mashita', 'masendeshita', 'te', 'ba'];
  const ROW = { 'う': 'わいうえお', 'く': 'かきくけこ', 'ぐ': 'がぎぐげご', 'す': 'さしすせそ', 'つ': 'たちつてと', 'ぬ': 'なにぬねの', 'ぶ': 'ばびぶべぼ', 'む': 'まみむめも', 'る': 'らりるれろ' };
  const TE = { 'う': 'って', 'つ': 'って', 'る': 'って', 'く': 'いて', 'ぐ': 'いで', 'す': 'して', 'ぬ': 'んで', 'ぶ': 'んで', 'む': 'んで' };
  const KANJI = /[一-龯々〆ヵヶ]/;
  const isKana = s => /^[ぁ-ゖァ-ヺー・\s]+$/.test(s || '');
  // 漢字＋假名寫法 → 《》注音（例：食べる/たべる → 食《た》べる）。對不上就回傳 null。
  function furiOf(ja, kana) {
    if (!ja || ja === kana) return ja || kana;
    const parts = ja.match(/[一-龯々〆ヵヶ]+|[^一-龯々〆ヵヶ]+/g) || [];
    const kat = c => c.replace(/[ァ-ヶ]/g, x => String.fromCharCode(x.charCodeAt(0) - 0x60));
    const re = new RegExp('^' + parts.map(p => KANJI.test(p) ? '(.+?)' : '(' + kat(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')').join('') + '$');
    const m = kat(kana).match(re); if (!m) return null;
    return parts.map((p, i) => KANJI.test(p) ? p + '《' + m[i + 1] + '》' : p).join('');
  }
  function godan(k, ja) {  // k: kana of the whole verb
    const last = k.slice(-1), st = k.slice(0, -1), r = ROW[last]; if (!r) return null;
    const a = r[0], i = r[1], e = r[3], o = r[4];
    let te = TE[last]; if (/いく$/.test(k) && (k === 'いく' || /行く$/.test(ja || ''))) te = 'って';
    const ta = te.replace('て', 'た').replace('で', 'だ');
    const nai = (k === 'ある') ? 'ない' : st + a + 'ない';
    const f = {
      dict: k, nai, ta: st + ta, nakatta: nai.replace(/ない$/, 'なかった'),
      masu: st + i + 'ます', masen: st + i + 'ません', mashita: st + i + 'ました', masendeshita: st + i + 'ませんでした', mashou: st + i + 'ましょう',
      te: st + te, teiru: st + te + 'いる', tai: st + i + 'たい', vol: st + o + 'う', pot: st + e + 'る', ba: st + e + 'ば',
      imp: st + e, proh: k + 'な', passive: st + a + 'れる', caus: st + a + 'せる',
      causpass: last === 'す' ? st + a + 'せられる' : st + a + 'される'
    };
    return f;
  }
  function ichidan(k) {
    const st = k.slice(0, -1);
    return { dict: k, nai: st + 'ない', ta: st + 'た', nakatta: st + 'なかった', masu: st + 'ます', masen: st + 'ません', mashita: st + 'ました',
      masendeshita: st + 'ませんでした', mashou: st + 'ましょう', te: st + 'て', teiru: st + 'ている', tai: st + 'たい', vol: st + 'よう',
      pot: st + 'られる', ba: st + 'れば', imp: st + 'ろ', proh: k + 'な', passive: st + 'られる', caus: st + 'させる', causpass: st + 'させられる' };
  }
  const SURU = { dict: 'する', nai: 'しない', ta: 'した', nakatta: 'しなかった', masu: 'します', masen: 'しません', mashita: 'しました', masendeshita: 'しませんでした',
    mashou: 'しましょう', te: 'して', teiru: 'している', tai: 'したい', vol: 'しよう', pot: 'できる', ba: 'すれば', imp: 'しろ', proh: 'するな',
    passive: 'される', caus: 'させる', causpass: 'させられる' };
  const KURU = { dict: 'くる', nai: 'こない', ta: 'きた', nakatta: 'こなかった', masu: 'きます', masen: 'きません', mashita: 'きました', masendeshita: 'きませんでした',
    mashou: 'きましょう', te: 'きて', teiru: 'きている', tai: 'きたい', vol: 'こよう', pot: 'こられる', ba: 'くれば', imp: 'こい', proh: 'くるな',
    passive: 'こられる', caus: 'こさせる', causpass: 'こさせられる' };
  function commonSuffix(a, b) { let n = 0; while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++; return n; }
  // 依 kana 的變化，套回漢字寫法；回傳 [lab, furi, plain, kana]
  function render(ja, kana, fk, oldTailLen, kuru) {
    const out = [];
    ORDER.forEach(key => {
      const fkana = fk[key]; if (!fkana) return;
      let plain = fkana, furi = fkana;
      if (ja && ja !== kana) {
        if (kuru) {  // …来る：来 的讀音會變（こ／き／く）
          const pj = ja.slice(0, -2), pk = kana.slice(0, -2), tail = fkana.slice(pk.length);  // tail 例：こない
          const yomi = tail[0], rest = tail.slice(1);
          plain = pj + '来' + rest;
          furi = (furiOf(pj, pk) || pj) + '来《' + yomi + '》' + rest;
        } else {
          const sj = ja.slice(0, ja.length - oldTailLen), sk = kana.slice(0, kana.length - oldTailLen);
          const tail = fkana.slice(sk.length);
          plain = sj + tail;
          const fs = furiOf(sj, sk);
          furi = fs != null ? fs + tail : plain;
        }
      }
      out.push([LAB[key], furi, plain, fkana]);
    });
    return out;
  }
  /* group: 'I' | 'II' | 'III'。ja 可空白（只有假名）。回傳 null 表示無法變化（格式不符）。 */
  function conjugate(ja, kana, group) {
    kana = String(kana || '').trim(); ja = String(ja || '').trim() || kana;
    if (!kana || !isKana(kana)) return null;
    const suf = commonSuffix(ja, kana);
    if (group === 'III') {
      if (/する$/.test(kana)) {
        const pk = kana.slice(0, -2), fk = {}; Object.keys(SURU).forEach(k => fk[k] = pk + SURU[k]);
        return render(ja, kana, fk, Math.min(2, suf), false);
      }
      if (/くる$/.test(kana)) {
        const pk = kana.slice(0, -2), fk = {}; Object.keys(KURU).forEach(k => fk[k] = pk + KURU[k]);
        return render(ja, kana, fk, 1, /来る$/.test(ja));
      }
      return null;
    }
    if (group === 'II') {
      if (!/る$/.test(kana)) return null;
      return render(ja, kana, ichidan(kana), Math.max(1, Math.min(suf, 1)), false);
    }
    if (group === 'I') {
      const f = godan(kana, ja); if (!f) return null;
      const out = render(ja, kana, f, 1, false);
      return kana === 'ある' ? out.filter((_, i) => BASIC.includes(ORDER[i])) : out;
    }
    return null;
  }
  function newId() { return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  return { LAB, ORDER, conjugate, isKana, newId, furiOf };
});
