/* v3.50 動詞變化「怎麼變」：依動詞類別（I／II／III）說明每一種形怎麼從辭書形變出來。
   App（window.VRule）與 test_vrule.js（node）共用。只做說明文字，不碰 localStorage。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VRule = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const ORDER = ['dict', 'nai', 'ta', 'nakatta', 'masu', 'masen', 'mashita', 'masendeshita', 'mashou', 'te', 'teiru', 'tai', 'vol', 'pot', 'ba', 'imp', 'proh', 'passive', 'caus', 'causpass'];
  const PRE = { '辭書形': 'dict', 'ない形': 'nai', 'た形': 'ta', 'なかった形': 'nakatta', 'ます形': 'masu', 'ません': 'masen', 'ました': 'mashita', 'ませんでした': 'masendeshita',
    'ましょう': 'mashou', 'て形': 'te', 'ている': 'teiru', 'たい': 'tai', '意向形': 'vol', '可能形': 'pot', 'ば形': 'ba', '命令形': 'imp', '禁止形': 'proh',
    '受身形': 'passive', '使役形': 'caus', '使役受身形': 'causpass' };
  const NAME = { dict: '辭書形', nai: 'ない形', ta: 'た形', nakatta: 'なかった形', masu: 'ます形', masen: 'ません', mashita: 'ました', masendeshita: 'ませんでした',
    mashou: 'ましょう', te: 'て形', teiru: 'ている', tai: 'たい', vol: '意向形', pot: '可能形', ba: 'ば形', imp: '命令形', proh: '禁止形', passive: '受身形',
    caus: '使役形', causpass: '使役受身形' };
  function keyOf(lab) { const p = String(lab || '').split('（')[0].trim(); return PRE[p] || null; }
  const ROW = { 'う': 'わいうえお', 'く': 'かきくけこ', 'ぐ': 'がぎぐげご', 'す': 'さしすせそ', 'つ': 'たちつてと', 'ぬ': 'なにぬねの', 'ぶ': 'ばびぶべぼ', 'む': 'まみむめも', 'る': 'らりるれろ' };
  const TE = { 'う': 'って', 'つ': 'って', 'る': 'って', 'く': 'いて', 'ぐ': 'いで', 'す': 'して', 'ぬ': 'んで', 'ぶ': 'んで', 'む': 'んで' };
  const HON = /(いらっしゃる|おっしゃる|くださる|なさる|ござる)$/;   // 敬語動詞：ます形・命令形用「い」
  // 分類：回傳 {g, kind}；kind = godan | ichidan | suru | kuru
  function kindOf(kana, g, ja) {
    if (g === 'III') return /くる$/.test(kana) && (/来る$/.test(ja || '') || kana === 'くる') ? 'kuru' : 'suru';
    return g === 'II' ? 'ichidan' : 'godan';
  }
  function isIku(kana, ja) { return /いく$/.test(kana) && (kana === 'いく' || /行く$/.test(ja || '')); }
  /* 依規則算出某一形的假名（測試用來對照課本資料） */
  function predict(kana, g, key, ja) {
    const kind = kindOf(kana, g, ja);
    if (kind === 'suru' || kind === 'kuru') {
      const p = kana.slice(0, -2);
      const S = kind === 'suru'
        ? { dict: 'する', nai: 'しない', ta: 'した', nakatta: 'しなかった', masu: 'します', masen: 'しません', mashita: 'しました', masendeshita: 'しませんでした', mashou: 'しましょう', te: 'して', teiru: 'している', tai: 'したい', vol: 'しよう', pot: 'できる', ba: 'すれば', imp: 'しろ', proh: 'するな', passive: 'される', caus: 'させる', causpass: 'させられる' }
        : { dict: 'くる', nai: 'こない', ta: 'きた', nakatta: 'こなかった', masu: 'きます', masen: 'きません', mashita: 'きました', masendeshita: 'きませんでした', mashou: 'きましょう', te: 'きて', teiru: 'きている', tai: 'きたい', vol: 'こよう', pot: 'こられる', ba: 'くれば', imp: 'こい', proh: 'くるな', passive: 'こられる', caus: 'こさせる', causpass: 'こさせられる' };
      return p + S[key];
    }
    const st = kana.slice(0, -1);
    if (kind === 'ichidan') {
      const T = { dict: 'る', nai: 'ない', ta: 'た', nakatta: 'なかった', masu: 'ます', masen: 'ません', mashita: 'ました', masendeshita: 'ませんでした', mashou: 'ましょう', te: 'て', teiru: 'ている', tai: 'たい', vol: 'よう', pot: 'られる', ba: 'れば', imp: 'ろ', proh: 'るな', passive: 'られる', caus: 'させる', causpass: 'させられる' };
      return st + T[key];
    }
    const last = kana.slice(-1), r = ROW[last]; if (!r) return null;
    const a = r[0], e = r[3], o = r[4], i = HON.test(kana) ? 'い' : r[1];
    let te = TE[last]; if (isIku(kana, ja)) te = 'って';
    const ta = te.replace('て', 'た').replace('で', 'だ');
    const nai = kana === 'ある' ? 'ない' : st + a + 'ない';
    const F = { dict: kana, nai, ta: st + ta, nakatta: nai.replace(/ない$/, 'なかった'), masu: st + i + 'ます', masen: st + i + 'ません', mashita: st + i + 'ました',
      masendeshita: st + i + 'ませんでした', mashou: st + i + 'ましょう', te: st + te, teiru: st + te + 'いる', tai: st + i + 'たい', vol: st + o + 'う',
      pot: st + e + 'る', ba: st + e + 'ば', imp: HON.test(kana) ? st + 'い' : st + e, proh: kana + 'な', passive: st + a + 'れる', caus: st + a + 'せる',
      causpass: last === 'す' ? st + a + 'せられる' : st + a + 'される' };
    return F[key];
  }
  /* 各類別的一般規則（不含這個字的答案） */
  const RULE = {
    godan: { dict: '字典上查到的原形，字尾是う段（う・く・ぐ・す・つ・ぬ・ぶ・む・る）',
      nai: '字尾う段 → あ段＋ない（う 結尾變成 わ：会（あ）う → 会（あ）わない）', ta: '跟て形一樣的音便，把 て／で 換成 た／だ',
      nakatta: 'ない形的「ない」→「なかった」', masu: '字尾う段 → い段＋ます', masen: 'ます形的「ます」→「ません」', mashita: 'ます形的「ます」→「ました」',
      masendeshita: 'ます形的「ます」→「ませんでした」', mashou: 'ます形的「ます」→「ましょう」',
      te: '看字尾：う・つ・る → って｜む・ぶ・ぬ → んで｜く → いて｜ぐ → いで｜す → して（例外：行（い）く → 行（い）って）', teiru: 'て形＋いる',
      tai: 'ます形去掉「ます」＋たい', vol: '字尾う段 → お段＋う', pot: '字尾う段 → え段＋る', ba: '字尾う段 → え段＋ば', imp: '字尾う段 → え段',
      proh: '辭書形＋な', passive: '字尾う段 → あ段＋れる（う → わ）', caus: '字尾う段 → あ段＋せる（う → わ）',
      causpass: '字尾う段 → あ段＋される（口語短形；す 結尾不能縮短，用 あ段＋せられる。正式長形：あ段＋せられる）' },
    ichidan: { dict: '字典上查到的原形，字尾是「い段／え段＋る」', nai: '去掉る＋ない', ta: '去掉る＋た', nakatta: '去掉る＋なかった', masu: '去掉る＋ます',
      masen: '去掉る＋ません', mashita: '去掉る＋ました', masendeshita: '去掉る＋ませんでした', mashou: '去掉る＋ましょう', te: '去掉る＋て', teiru: 'て形＋いる',
      tai: '去掉る＋たい', vol: '去掉る＋よう', pot: '去掉る＋られる（口語常說成 〜れる）', ba: '去掉る＋れば', imp: '去掉る＋ろ', proh: '辭書形＋な',
      passive: '去掉る＋られる（跟可能形長得一樣，看句子判斷）', caus: '去掉る＋させる', causpass: '去掉る＋させられる' },
    suru: { dict: '〜する（名詞＋する）', nai: 'する → しない', ta: 'する → した', nakatta: 'する → しなかった', masu: 'する → します', masen: 'する → しません',
      mashita: 'する → しました', masendeshita: 'する → しませんでした', mashou: 'する → しましょう', te: 'する → して', teiru: 'する → している', tai: 'する → したい',
      vol: 'する → しよう', pot: 'する → できる（整個換掉）', ba: 'する → すれば', imp: 'する → しろ', proh: 'する → するな', passive: 'する → される',
      caus: 'する → させる', causpass: 'する → させられる' },
    kuru: { dict: '来る（くる）', nai: '来る → 来（こ）ない', ta: '来る → 来（き）た', nakatta: '来る → 来（こ）なかった', masu: '来る → 来（き）ます',
      masen: '来る → 来（き）ません', mashita: '来る → 来（き）ました', masendeshita: '来る → 来（き）ませんでした', mashou: '来る → 来（き）ましょう',
      te: '来る → 来（き）て', teiru: '来る → 来（き）ている', tai: '来る → 来（き）たい', vol: '来る → 来（こ）よう', pot: '来る → 来（こ）られる',
      ba: '来る → 来（く）れば', imp: '来る → 来（こ）い', proh: '来る → 来（く）るな', passive: '来る → 来（こ）られる', caus: '来る → 来（こ）させる',
      causpass: '来る → 来（こ）させられる' }
  };
  const GNAME = { godan: 'I 類（五段）', ichidan: 'II 類（一段）', suru: 'III 類（する）', kuru: 'III 類（来る）' };
  /* 這個字特有的例外說明 */
  function irregular(kana, g, key, ja) {
    const kind = kindOf(kana, g, ja);
    if (kind !== 'godan') return '';
    if (kana === 'ある' && (key === 'nai' || key === 'nakatta')) return '例外：ある 的否定不是「あらない」，而是直接說「ない」「なかった」。';
    if (isIku(kana, ja) && /^(te|ta|teiru)$/.test(key)) return '例外：行（い）く 雖然是 く 結尾，て形是「行って」不是「いいて」（た形也是「行（い）った」）。';
    if (HON.test(kana) && /^(masu|masen|mashita|masendeshita|mashou|tai|imp)$/.test(key)) return '例外：いらっしゃる・おっしゃる・くださる・なさる 這類敬語動詞，ます形用「い」不用「り」（いらっしゃいます），命令形是「いらっしゃい」。';
    if (/る$/.test(kana) && /[いきぎしじちにひびみりえけげせぜてでねへべめれ]る$/.test(kana) && key === 'dict') return '注意：長得像 II 類（い段／え段＋る），但這個字是 I 類，要照五段變化。';
    return '';
  }
  // 這個字的具體變化：去掉共同開頭，只看字尾哪裡變了
  function change(from, to) {
    let n = 0; while (n < from.length && n < to.length && from[n] === to[n]) n++;
    if (n === from.length && n > 0) n--;            // 例：する → するな，至少顯示最後一個字
    return { stem: from.slice(0, n), a: from.slice(n), b: to.slice(n) };
  }
  // 一般規則中把「う段」具體化成這個字的字尾（例：く → こ）
  function specific(kana, g, key, ja) {
    const kind = kindOf(kana, g, ja); if (kind !== 'godan') return '';
    const last = kana.slice(-1), r = ROW[last]; if (!r) return '';
    const col = { nai: 0, masu: 1, masen: 1, mashita: 1, masendeshita: 1, mashou: 1, tai: 1, vol: 4, pot: 3, ba: 3, imp: 3, passive: 0, caus: 0, causpass: 0 }[key];
    if (col === undefined) { if (key === 'te' || key === 'ta' || key === 'teiru') { const t = isIku(kana, ja) ? 'って' : TE[last]; return `這個字是「${last}」結尾 → ${key === 'ta' ? t.replace('て', 'た').replace('で', 'だ') : t}`; } return ''; }
    if (col === 1 && HON.test(kana)) return `這個字是敬語動詞：る → い`;
    return `這個字是「${last}」結尾 → ${r[col]}`;
  }
  function explain(kana, g, key, ja, formKana) {
    const kind = kindOf(kana, g, ja), rule = (RULE[kind] || {})[key];
    if (!rule) return null;
    const to = formKana || predict(kana, g, key, ja);
    const irr = irregular(kana, g, key, ja);
    return { kind, gname: GNAME[kind], name: NAME[key], rule, spec: irr && /^例外/.test(irr) && kana === 'ある' ? '' : specific(kana, g, key, ja), irr, chg: to ? change(kana, to) : null };
  }
  /* 📘 總表：用課本常見的例字（不是這個字，所以不會洩漏答案） */
  const EX = { godan: ['書く', 'かく', '書《か》く'], ichidan: ['食べる', 'たべる', '食《た》べる'], suru: ['勉強する', 'べんきょうする', '勉強《べんきょう》する'], kuru: ['来る', 'くる', '来《く》る'] };
  function table(kind) {
    const ex = EX[kind] || EX.godan, g = kind === 'godan' ? 'I' : kind === 'ichidan' ? 'II' : 'III';
    return ORDER.map(key => { const k = predict(ex[1], g, key, ex[0]); let furi;
      if (kind === 'kuru') furi = '来《' + k[0] + '》' + k.slice(1);
      else { const head = ex[2].match(/^(.*》)/)[1], tailLen = ex[2].length - head.length; furi = head + k.slice(ex[1].length - tailLen); }
      return { key, name: NAME[key], rule: RULE[kind][key], ex: furi, kana: k };
    });
  }
  return { ORDER, NAME, GNAME, keyOf, kindOf, predict, explain, table, RULE, EX };
});
