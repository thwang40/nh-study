/* 第12課 單語（先做這一課給使用者看風格）。
   資料依使用者提供的官方單語表照片整理（第12課、p.42–45），含「いろいろな表現」。音高記號依單語表上的上線／下降記號逐詞對過。
   聽力優先頁使用虛擬對話 id：t12，音檔 audio/t12_<i>.mp3（不更動既有 w_<n> 單字音檔編號）。 */
(function (root) {
  'use strict';
  const T12_WORDS = [
    { n:1,  ja:'フライパン', kana:'フライパン', zh:'平底鍋，煎鍋', pg:42 , acc:0 },
    { n:2,  ja:'牛丼', kana:'ぎゅうどん', zh:'牛肉蓋飯', pg:42, say:'牛丼' , acc:0 },
    { n:3,  ja:'生徒', kana:'せいと', zh:'（高中以下的）學生', pg:42 , acc:1 },
    { n:4,  ja:'では', kana:'では', zh:'那麼', pg:42 , acc:1 },
    { n:5,  ja:'たまねぎ', kana:'たまねぎ', zh:'洋蔥', pg:42 , acc:3 },
    { n:6,  ja:'切る', kana:'きる', zh:'剪，切', pg:42 , acc:1 },
    { n:7,  ja:'どのぐらい（大きい）', kana:'どのぐらい（おおきい）', zh:'大概多（大）', pg:42, say:'どのぐらい大きい' , acc:0, pk:'どのぐらい' },
    { n:8,  ja:'大きさ', kana:'おおきさ', zh:'大小', pg:42 , acc:0 },
    { n:9,  ja:'半分', kana:'はんぶん', zh:'一半', pg:42 , acc:3 },
    { n:10, ja:'薄い', kana:'うすい', zh:'薄的', pg:42 , acc:0 },
    { n:11, ja:'牛肉', kana:'ぎゅうにく', zh:'牛肉', pg:42 , acc:0 },
    { n:12, ja:'次に', kana:'つぎに', zh:'接著', pg:42 , acc:2 },
    { n:13, ja:'調味料', kana:'ちょうみりょう', zh:'調味料', pg:42 , acc:4 },
    { n:14, ja:'火', kana:'ひ', zh:'火', pg:42 , acc:1 },
    { n:15, ja:'（火を）つける', kana:'（ひを）つける', zh:'點（火）', pg:42, say:'火をつける' , acc:2, pk:'つける' },
    { n:16, ja:'強さ', kana:'つよさ', zh:'強度', pg:42 , acc:1 },
    { n:17, ja:'中火', kana:'ちゅうび', zh:'中火', pg:42 , acc:0 },
    { n:18, ja:'煮る', kana:'にる', zh:'煮', pg:43 , acc:1 },
    { n:19, ja:'質問', kana:'しつもん', zh:'問題，提問', pg:43 , acc:0 },
    { n:20, ja:'（質問が）ある', kana:'（しつもんが）ある', zh:'有（問題）', pg:43, say:'質問がある' , acc:1, pk:'ある' },
    { n:21, ja:'材料', kana:'ざいりょう', zh:'材料', pg:43 , acc:3 },
    { n:22, ja:'（3人）分', kana:'（さんにん）ぶん', zh:'（3人）份', pg:43, say:'さんにんぶん' , acc:0, pk:'さんにんぶん' },
    { n:23, ja:'薄切り', kana:'うすぎり', zh:'切薄，薄片', pg:43 , acc:0 },
    { n:24, ja:'（10）グラム', kana:'（じゅう）グラム', zh:'（10）克', pg:43, say:'じゅうグラム' , acc:0, pk:'じゅう' },
    { n:25, ja:'ねぎ', kana:'ねぎ', zh:'蔥', pg:43 , acc:1 },
    { n:26, ja:'（砂糖）少々', kana:'（さとう）しょうしょう', zh:'少許（砂糖）', pg:43, say:'砂糖、少々' , acc:3, pk:'しょうしょう' },
    { n:27, ja:'ごはん', kana:'ごはん', zh:'飯，米飯', pg:43 , acc:1 },
    { n:28, ja:'（に）杯', kana:'（に）はい', zh:'（2）杯', pg:43, say:'にはい' , acc:1, pk:'に' },
    { n:29, ja:'大さじ', kana:'おおさじ', zh:'大匙', pg:43 , acc:0 },
    { n:30, ja:'しょうゆ', kana:'しょうゆ', zh:'醬油', pg:43 , acc:0 },
    { n:31, ja:'（火を）止める', kana:'（ひを）とめる', zh:'關（火）', pg:43, say:'火を止める' , acc:0, pk:'とめる' },
    { n:32, ja:'（上に）のせる', kana:'（うえに）のせる', zh:'盛（上），放（上）', pg:43, say:'上にのせる' , acc:0, pk:'のせる' },
    { n:33, ja:'ジム', kana:'ジム', zh:'吉姆（人名）', pg:43 , acc:1 },
    { n:34, ja:'日本人', kana:'にほんじん', zh:'日本人', pg:43 , acc:4 },
    { n:35, ja:'はし／おはし', kana:'はし／おはし', zh:'筷子', pg:43, say:'はし。おはし' , acc:[1, 2] },
    { n:36, ja:'自由', kana:'じゆう', zh:'自由', pg:43 , acc:1 },
    { n:37, ja:'早い', kana:'はやい', zh:'早的，快的', pg:43 , acc:2 },
    { n:38, ja:'遅い', kana:'おそい', zh:'晚的，慢的', pg:43 , acc:0 },
    { n:39, ja:'洗濯機', kana:'せんたくき', zh:'洗衣機', pg:44 , acc:4 },
    { n:40, ja:'集合する', kana:'しゅうごうする', zh:'集合', pg:44 , acc:0 },
    { n:41, ja:'パレード', kana:'パレード', zh:'遊行', pg:44 , acc:1 },
    { n:42, ja:'始める', kana:'はじめる', zh:'開始', pg:44 , acc:0 },
    { n:43, ja:'柔らかい', kana:'やわらかい', zh:'柔軟的', pg:44 , acc:4 },
    { n:44, ja:'簡単', kana:'かんたん', zh:'簡單的', pg:44 , acc:0 },
    { n:45, ja:'（時間が）長い', kana:'（じかんが）ながい', zh:'（時間）長的', pg:44, say:'時間が長い' , acc:2, pk:'ながい' },
    { n:46, ja:'固い', kana:'かたい', zh:'硬的，堅固的', pg:44 , acc:0 },
    { n:47, ja:'注意する', kana:'ちゅういする', zh:'小心，注意', pg:44 , acc:3 },
    { n:48, ja:'温かい', kana:'あたたかい', zh:'溫熱的', pg:44 , acc:4 },
    { n:49, ja:'できあがり', kana:'できあがり', zh:'完成，做好', pg:44 , acc:0 },
    { n:50, ja:'（牛丼が）できる', kana:'（ぎゅうどんが）できる', zh:'會做（牛肉蓋飯）', pg:44, say:'牛丼ができる' , acc:2, pk:'できる' },
    { n:51, ja:'旅館', kana:'りょかん', zh:'旅館', pg:44 , acc:0 },
    { n:52, ja:'気温', kana:'きおん', zh:'氣溫', pg:44 , acc:0 },
    { n:53, ja:'（気温が）高い', kana:'（きおんが）たかい', zh:'（氣溫）高的', pg:44, say:'気温が高い' , acc:2, pk:'たかい' },
    { n:54, ja:'木', kana:'き', zh:'樹木，木材', pg:44 , acc:1 },
    { n:55, ja:'建物', kana:'たてもの', zh:'建築物', pg:44 , acc:2 },
    { n:56, ja:'川', kana:'かわ', zh:'河川', pg:44 , acc:2 },
    { n:57, ja:'甘い', kana:'あまい', zh:'甜的', pg:44 , acc:0 },
    { n:58, ja:'この辺', kana:'このへん', zh:'這附近，這一帶', pg:44, say:'このへん' , acc:0 },
    { n:59, ja:'桜', kana:'さくら', zh:'櫻花', pg:44 , acc:0 },
    { n:60, ja:'春', kana:'はる', zh:'春天', pg:45 , acc:1 },
    { n:61, ja:'咲く', kana:'さく', zh:'（花）開', pg:45 , acc:2 }
  ];
  const T12_EXPR = [
    { n:1, ja:'わあ、', kana:'わあ、', zh:'哇！（表示驚訝或感動）', pg:45, say:'わあ' },
    { n:2, ja:'もういいですか。', kana:'もういいですか。', zh:'已經可以了嗎？', pg:45, say:'もういいですか？' }
  ];

  function packLines(words, kind) {
    return words.map(w => ({
      s: 'A', ja: w.ja, kana: w.kana, zh: w.zh, say: w.say || '',
      pg: w.pg, no: w.n, kind: kind, g: [], v: [],
      lab: kind === 'expr' ? `表現 ${w.n}` : String(w.n),
      acc: w.acc, pk: w.pk || ''
    }));
  }

  root.BOOK = root.BOOK || {};
  root.BOOK.tango = root.BOOK.tango || {};
  root.BOOK.tango[12] = {
    pages: [42, 43, 44, 45],
    source: '官方單語表',
    title: '簡単！日本料理クラス',
    words: T12_WORDS,
    expr: T12_EXPR,
    lines: packLines(T12_WORDS, 'word').concat(packLines(T12_EXPR, 'expr'))
  };
})(typeof window !== 'undefined' ? window : globalThis);
