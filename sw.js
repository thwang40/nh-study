const APP_VER = '3.52';   // 要和 app.js APP_VER、version.json、index.html 一致（test_version.js 會檢查）
const SHELL = 'nh-shell-v101', AUDIO = 'nh-audio-v9', PAGES = 'nh-pages-v1';
const SHELL_FILES = ['./','index.html','style.css','app.js','data.js','tango.js','tango-ex.js','mix.js','vforms.js','vfex.js','mine-core.js','vrule.js','mine.js','tags.js','ill.js','sec.js','blk.js','firebase-config.js','sync-merge.js','sync-auth.js','sync.js','auth-callback.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png','icons/maskable-512.png'].concat(["pages/ill2/1-T1_0.webp", "pages/ill2/1-T2_0.webp", "pages/ill2/1-T3_0.webp", "pages/ill2/1-T3_1.webp", "pages/ill2/10-T1_0.webp", "pages/ill2/10-T2_0.webp", "pages/ill2/11-T1_0.webp", "pages/ill2/11-T2_0.webp", "pages/ill2/11-T3_0.webp", "pages/ill2/12-T1_0.webp", "pages/ill2/12-T2_0.webp", "pages/ill2/12-T2_1.webp", "pages/ill2/12-T2_2.webp", "pages/ill2/12-T2_3.webp", "pages/ill2/12-T2_4.webp", "pages/ill2/2-T1_0.webp", "pages/ill2/2-T1_1.webp", "pages/ill2/2-T1_2.webp", "pages/ill2/2-T1_3.webp", "pages/ill2/2-T1_4.webp", "pages/ill2/2-T1_5.webp", "pages/ill2/2-T1_6.webp", "pages/ill2/2-T1_7.webp", "pages/ill2/2-T2_0.webp", "pages/ill2/3-T1_0.webp", "pages/ill2/3-T1_1.webp", "pages/ill2/4-T2_0.webp", "pages/ill2/4-T2_1.webp", "pages/ill2/5-T1_0.webp", "pages/ill2/5-T2_0.webp", "pages/ill2/5-T2_1.webp", "pages/ill2/5-T2_2.webp", "pages/ill2/6-T1_0.webp", "pages/ill2/6-T1_1.webp", "pages/ill2/6-T1_2.webp", "pages/ill2/6-T1_3.webp", "pages/ill2/6-T1_4.webp", "pages/ill2/6-T2_0.webp", "pages/ill2/6-T2_1.webp", "pages/ill2/6-T2_2.webp", "pages/ill2/6-T3_0.webp", "pages/ill2/6-T3_1.webp", "pages/ill2/6-T3_2.webp", "pages/ill2/6-T3_3.webp", "pages/ill2/6-T3_4.webp", "pages/ill2/6-T3_5.webp", "pages/ill2/7-T1_0.webp", "pages/ill2/7-T1_1.webp", "pages/ill2/7-T2_0.webp", "pages/ill2/7-T2_1.webp", "pages/ill2/7-T2_2.webp", "pages/ill2/7-T3_0.webp", "pages/ill2/7-T3_1.webp", "pages/ill2/8-T1_0.webp", "pages/ill2/8-T1_1.webp", "pages/ill2/8-T2_0.webp", "pages/ill2/9-T1_0.webp", "pages/ill2/9-T2_0.webp", "pages/ill2/9-T2_1.webp", "pages/ill2/9-T3_0.webp", "pages/ill2/9-T3_1.webp"]);
self.window = self; importScripts('data.js'); importScripts('tango.js'); importScripts('tango-ex.js'); importScripts('mix.js'); importScripts('vforms.js'); importScripts('vfex.js'); importScripts('mine.js');
const AUDIO_FILES = self.BOOK.dialogues.flatMap(d => d.lines.flatMap((_, i) => [`audio/${d.id}_${i}.mp3`, `audio/${d.id}_${i}_s.mp3`]));
// 逐句聽力練習（長輪次拆句）audio/<id>-s_<k>.mp3
self.BOOK.dialogues.forEach(d => { let k = 0; d.lines.forEach(ln => (ln.parts || []).forEach(() => { AUDIO_FILES.push(`audio/${d.id}-s_${k}.mp3`, `audio/${d.id}-s_${k}_s.mp3`); k++; })); });
// 同文型聽力練習（課本文型例句）的音檔也預先存離線
AUDIO_FILES.push(...Object.entries(self.BOOK.drills || {}).flatMap(([k, items]) => items.flatMap((_, i) => [`audio/g${k}_${i}.mp3`, `audio/g${k}_${i}_s.mp3`])));
// 單字音檔（搜尋「聽力模式」用）audio/w_<n>.mp3，n = Object.keys(BOOK.vocab) 的順序
Object.keys(self.BOOK.vocab || {}).forEach((_, n) => AUDIO_FILES.push(`audio/w_${n}.mp3`, `audio/w_${n}_s.mp3`));
Object.keys(self.BOOK.tango || {}).forEach(n => { (self.BOOK.tango[n].lines || []).forEach((_, i) => AUDIO_FILES.push(`audio/t${n}_${i}.mp3`, `audio/t${n}_${i}_s.mp3`)); });
Object.entries(self.BOOK.tangoEx || {}).forEach(([n, items]) => (items||[]).forEach((_, i) => AUDIO_FILES.push(`audio/t${n}e_${i}.mp3`, `audio/t${n}e_${i}_s.mp3`)));
(self.BOOK.mix || []).forEach((_, i) => AUDIO_FILES.push(`audio/mx_${i}.mp3`, `audio/mx_${i}_s.mp3`));
// 單語頁動詞變化聽力 audio/vf<j>_<k>.mp3
(self.BOOK.vf || []).forEach((v, j) => v.f.forEach((_, k) => AUDIO_FILES.push(`audio/vf${j}_${k}.mp3`, `audio/vf${j}_${k}_s.mp3`)));
Object.entries(self.BOOK.vfx || {}).forEach(([j, m]) => Object.keys(m).forEach(k => AUDIO_FILES.push(`audio/vfx${j}_${k}.mp3`, `audio/vfx${j}_${k}_s.mp3`)));   // v3.51 🗣 造句
// 我的單語（mine.js，bake_mine.py 產生）
Object.entries(self.BOOK.mine || {}).forEach(([id, m]) => { const add = b => AUDIO_FILES.push(b + '.mp3', b + '_s.mp3'); if (m.w) add(`audio/my_${id}_0`); (m.ex || []).forEach((_, k) => add(`audio/mye_${id}_${k}`)); for (let k = 0; k < (m.nf || 0); k++) add(`audio/myf_${id}_${k}`); });
// v3.47 重新產生的音檔（疑問句句尾上揚＋いつ 的聲調；檔名不變）
const REAUDIO_347 = new Set(["g2-5_2", "g2-5_9", "mx_0", "mx_1012", "mx_1022", "mx_1025", "mx_1028", "mx_1034", "mx_1035", "mx_1037", "mx_1039", "mx_104", "mx_1044", "mx_1058", "mx_1070", "mx_1071", "mx_1073", "mx_1074", "mx_1079", "mx_1082", "mx_1084", "mx_1089", "mx_1090", "mx_1096", "mx_1101", "mx_1103", "mx_1107", "mx_1108", "mx_1109", "mx_1110", "mx_1111", "mx_1113", "mx_1116", "mx_1121", "mx_1125", "mx_1126", "mx_1132", "mx_1133", "mx_1137", "mx_1139", "mx_1142", "mx_1145", "mx_1147", "mx_1148", "mx_1149", "mx_1150", "mx_1154", "mx_1155", "mx_117", "mx_12", "mx_124", "mx_129", "mx_13", "mx_134", "mx_136", "mx_138", "mx_140", "mx_145", "mx_147", "mx_153", "mx_159", "mx_16", "mx_169", "mx_17", "mx_174", "mx_18", "mx_199", "mx_2", "mx_200", "mx_202", "mx_207", "mx_208", "mx_21", "mx_22", "mx_228", "mx_231", "mx_234", "mx_236", "mx_238", "mx_239", "mx_24", "mx_243", "mx_244", "mx_249", "mx_25", "mx_251", "mx_254", "mx_259", "mx_262", "mx_267", "mx_27", "mx_270", "mx_271", "mx_272", "mx_273", "mx_274", "mx_275", "mx_281", "mx_291", "mx_296", "mx_298", "mx_299", "mx_30", "mx_301", "mx_304", "mx_308", "mx_310", "mx_313", "mx_324", "mx_328", "mx_329", "mx_330", "mx_331", "mx_334", "mx_336", "mx_338", "mx_34", "mx_344", "mx_348", "mx_350", "mx_351", "mx_353", "mx_356", "mx_36", "mx_373", "mx_374", "mx_381", "mx_384", "mx_39", "mx_395", "mx_40", "mx_406", "mx_41", "mx_415", "mx_416", "mx_419", "mx_42", "mx_423", "mx_435", "mx_440", "mx_441", "mx_45", "mx_452", "mx_455", "mx_457", "mx_460", "mx_465", "mx_467", "mx_468", "mx_47", "mx_474", "mx_475", "mx_48", "mx_487", "mx_494", "mx_495", "mx_496", "mx_498", "mx_501", "mx_503", "mx_504", "mx_507", "mx_51", "mx_510", "mx_513", "mx_519", "mx_523", "mx_524", "mx_528", "mx_529", "mx_53", "mx_530", "mx_531", "mx_533", "mx_534", "mx_535", "mx_536", "mx_537", "mx_539", "mx_540", "mx_541", "mx_553", "mx_559", "mx_563", "mx_566", "mx_567", "mx_568", "mx_569", "mx_571", "mx_572", "mx_573", "mx_574", "mx_575", "mx_58", "mx_581", "mx_584", "mx_588", "mx_592", "mx_597", "mx_60", "mx_600", "mx_601", "mx_602", "mx_603", "mx_604", "mx_605", "mx_606", "mx_607", "mx_608", "mx_610", "mx_611", "mx_612", "mx_613", "mx_622", "mx_63", "mx_630", "mx_632", "mx_638", "mx_639", "mx_64", "mx_640", "mx_641", "mx_642", "mx_643", "mx_644", "mx_645", "mx_647", "mx_648", "mx_649", "mx_65", "mx_655", "mx_657", "mx_659", "mx_664", "mx_667", "mx_668", "mx_669", "mx_674", "mx_675", "mx_677", "mx_678", "mx_679", "mx_681", "mx_682", "mx_683", "mx_684", "mx_690", "mx_699", "mx_7", "mx_703", "mx_708", "mx_710", "mx_711", "mx_712", "mx_713", "mx_715", "mx_717", "mx_719", "mx_72", "mx_720", "mx_721", "mx_73", "mx_747", "mx_749", "mx_757", "mx_76", "mx_766", "mx_77", "mx_771", "mx_776", "mx_782", "mx_783", "mx_784", "mx_785", "mx_788", "mx_79", "mx_790", "mx_791", "mx_793", "mx_795", "mx_800", "mx_801", "mx_802", "mx_81", "mx_811", "mx_814", "mx_815", "mx_818", "mx_819", "mx_82", "mx_821", "mx_823", "mx_826", "mx_828", "mx_829", "mx_844", "mx_849", "mx_85", "mx_854", "mx_857", "mx_859", "mx_86", "mx_860", "mx_87", "mx_872", "mx_890", "mx_891", "mx_893", "mx_894", "mx_898", "mx_899", "mx_9", "mx_929", "mx_930", "mx_940", "mx_95", "mx_951", "mx_952", "mx_960", "mx_962", "mx_963", "mx_964", "mx_965", "mx_968", "mx_97", "mx_972", "mx_973", "t10e_0", "t10e_107", "t10e_110", "t10e_146", "t10e_18", "t10e_20", "t10e_3", "t10e_39", "t10e_55", "t10e_57", "t10e_60", "t10e_61", "t10e_62", "t10e_73", "t11e_102", "t11e_104", "t11e_105", "t11e_107", "t11e_108", "t11e_110", "t11e_112", "t11e_114", "t11e_116", "t11e_128", "t11e_136", "t11e_139", "t11e_14", "t11e_158", "t11e_166", "t11e_180", "t11e_185", "t11e_188", "t11e_19", "t11e_202", "t11e_204", "t11e_210", "t11e_215", "t11e_22", "t11e_233", "t11e_239", "t11e_244", "t11e_41", "t11e_46", "t11e_49", "t11e_6", "t11e_69", "t11e_88", "t11e_96", "t11e_99", "t12e_103", "t12e_11", "t12e_114", "t12e_115", "t12e_118", "t12e_122", "t12e_124", "t12e_125", "t12e_14", "t12e_145", "t12e_153", "t12e_155", "t12e_162", "t12e_17", "t12e_171", "t12e_173", "t12e_18", "t12e_181", "t12e_19", "t12e_20", "t12e_23", "t12e_34", "t12e_43", "t12e_46", "t12e_53", "t12e_57", "t12e_60", "t12e_65", "t12e_71", "t12e_79", "t12e_82", "t12e_91", "t12e_95", "t13e_116", "t13e_118", "t13e_126", "t13e_138", "t13e_141", "t13e_18", "t13e_23", "t13e_24", "t13e_25", "t13e_33", "t13e_34", "t13e_35", "t13e_42", "t13e_43", "t13e_44", "t13e_60", "t13e_91", "t13e_92", "t13e_96", "t13e_97", "t13e_98", "t14e_110", "t14e_119", "t14e_14", "t14e_58", "t14e_81", "t15_8", "t15e_117", "t15e_12", "t15e_13", "t15e_139", "t15e_14", "t15e_15", "t15e_159", "t15e_175", "t15e_189", "t15e_2", "t15e_33", "t15e_39", "t15e_57", "t15e_58", "t15e_59", "t15e_77", "t15e_8", "t15e_83", "t15e_85", "t18_67", "t18e_1", "t18e_102", "t18e_11", "t18e_115", "t18e_120", "t18e_124", "t18e_139", "t18e_143", "t18e_149", "t18e_168", "t18e_177", "t18e_25", "t18e_30", "t18e_52", "t18e_61", "t18e_65", "t18e_67", "t18e_78", "t18e_8", "t18e_90", "t18e_95", "t18e_98", "t18e_99"]);
// v3.48 疑問詞問句句尾上揚加大（本文・文型・逐句・開口練習・場合使用；檔名不變）
const REAUDIO_348 = new Set(["1-2-r_0_0", "1-2-r_0_1", "1-2-r_2_0", "1-2-r_2_1", "1-2-r_4_0", "1-2-r_4_1", "1-2_0", "1-2_2", "1-2_4", "1-T1-x-r_5_0", "1-T3-r_2_0", "1-T3-r_2_1", "1-T3-r_4_0", "1-T3-r_4_1", "1-T3-r_6_0", "1-T3-r_6_1", "1-T3-x-r_0_0", "1-T3-x-r_0_1", "1-T3-x-r_2_0", "1-T3-x-r_2_1", "1-T3-x-r_4_0", "1-T3-x-r_4_1", "1-T3-x-r_7_0", "1-T3-x-r_7_1", "1-T3-x_0", "1-T3-x_2", "1-T3-x_4", "1-T3-x_7", "1-T3_2", "1-T3_4", "1-T3_6", "10-1-r_0_0", "10-1-r_0_1", "10-1-r_2_0", "10-1-r_2_1", "10-1-r_4_0", "10-1-r_4_1", "10-1_0", "10-1_2", "10-1_4", "10-2-r_0_0", "10-2-r_0_1", "10-2-r_3_0", "10-2-r_3_1", "10-2-s_1", "10-2_0", "10-2_3", "10-T1-x-r_0_0", "10-T1-x-r_2_0", "10-T1-x-r_2_1", "10-T1-x-r_4_0", "10-T1-x-r_4_1", "10-T1-x-r_7_0", "10-T1-x-r_7_1", "10-T1-x_0", "10-T1-x_2", "10-T1-x_4", "10-T1-x_7", "10-T2-r_12_0", "10-T2-r_12_1", "10-T2-r_2_0", "10-T2-r_4_0", "10-T2-r_6_0", "10-T2-x-r_0_0", "10-T2-x-r_5_0", "10-T2-x-r_5_1", "10-T2-x_0", "10-T2_12", "11-1-r_0_0", "11-1-r_0_1", "11-1-r_2_0", "11-1-r_4_0", "11-1-r_6_1", "11-1_0", "11-1_2", "11-2-r_0_0", "11-2-r_5_0", "11-2_0", "11-2_5", "11-T1-x-r_2_1", "11-T1-x-r_4_0", "11-T1-x-r_4_1", "11-T1-x-r_6_0", "11-T1-x_2", "11-T1-x_4", "11-T1-x_6", "11-T1-x_8", "11-T2-x-r_0_0", "11-T2-x-r_0_1", "11-T2-x-r_10_0", "11-T2-x-r_2_0", "11-T2-x-r_4_1", "11-T2-x-r_8_0", "11-T2-x-r_8_1", "11-T2-x_0", "11-T2-x_4", "11-T2-x_8", "11-T3-r_0_0", "11-T3-r_0_1", "11-T3-r_2_1", "11-T3-x-r_4_0", "11-T3-x-r_4_1", "11-T3-x-r_7_1", "11-T3-x_4", "11-T3-x_7", "11-T3_0", "12-1-r_0_0", "12-1-r_2_0", "12-1-r_2_1", "12-1-r_4_0", "12-1-r_4_1", "12-1_2", "12-1_4", "12-2-r_1_0", "12-2-r_1_1", "12-2-s_1", "12-2_1", "12-T1-r_3_0", "12-T1-r_3_1", "12-T1-r_6_1", "12-T1-x-r_1_0", "12-T1-x-r_1_1", "12-T1-x-r_6_0", "12-T1-x-r_6_1", "12-T1-x_6", "12-T1_3", "12-T1_6", "12-T2-r_4_0", "12-T2-x-r_3_0", "12-T2-x-r_3_1", "12-T2-x_3", "13-1-r_2_0", "13-1-r_2_1", "13-1-r_5_0", "13-1-r_5_1", "13-1_2", "13-1_5", "13-2-r_0_0", "13-2-r_0_1", "13-2-r_2_0", "13-2-r_2_1", "13-2-r_4_0", "13-2-r_4_1", "13-2-r_6_0", "13-2-s_3", "13-2_0", "13-2_2", "13-2_4", "13-2_6", "13-T1-r_13_0", "13-T1-r_13_1", "13-T1-r_5_0", "13-T1-r_7_0", "13-T1-r_7_1", "13-T1-s_4", "13-T1-s_6", "13-T1-x-r_0_1", "13-T1-x-r_3_0", "13-T1-x-r_3_1", "13-T1-x-r_6_0", "13-T1-x-r_6_1", "13-T1-x_3", "13-T1-x_6", "13-T1_13", "13-T1_4", "13-T1_5", "13-T1_7", "13-T2-r_0_0", "13-T2-r_0_1", "13-T2-r_3_0", "13-T2-r_3_1", "13-T2-r_5_0", "13-T2-r_5_1", "13-T2-s_1", "13-T2-x-r_0_0", "13-T2-x-r_0_1", "13-T2-x-r_3_0", "13-T2-x-r_3_1", "13-T2-x_0", "13-T2-x_3", "13-T2_0", "13-T2_3", "13-T2_5", "13-T3-x-r_1_0", "13-T3-x-r_1_1", "13-T3-x_1", "13-T3_3", "13-T3_6", "14-1-r_2_0", "14-1-r_2_1", "14-1_2", "14-2-r_0_0", "14-2-r_0_1", "14-2-r_3_0", "14-2-r_3_1", "14-2-r_5_1", "14-2-s_3", "14-2_0", "14-2_3", "14-T1-x-r_3_0", "14-T1-x-r_3_1", "14-T1-x-r_6_0", "14-T1-x-r_6_1", "14-T1-x-r_8_1", "14-T1-x_3", "14-T1-x_6", "14-T2-x-r_0_0", "14-T2-x-r_0_1", "14-T2-x-r_3_0", "14-T2-x-r_3_1", "14-T2-x-r_6_0", "14-T2-x_0", "14-T2-x_3", "14-T2-x_6", "15-1-r_0_0", "15-1-r_0_1", "15-1-r_2_0", "15-1-r_2_1", "15-1-s_1", "15-1_0", "15-1_2", "15-1_4", "15-2-r_0_0", "15-2-r_0_1", "15-2-r_3_0", "15-2-r_3_1", "15-2-r_6_0", "15-2-r_6_1", "15-2_0", "15-2_3", "15-2_6", "15-T1-r_2_0", "15-T1-r_2_1", "15-T1-r_4_0", "15-T1-r_4_1", "15-T1-r_6_0", "15-T1-s_5", "15-T1-x-r_0_0", "15-T1-x-r_0_1", "15-T1-x-r_3_0", "15-T1-x-r_3_1", "15-T1-x-r_6_0", "15-T1-x_0", "15-T1-x_3", "15-T1-x_6", "15-T1_2", "15-T1_4", "15-T1_6", "15-T2-r_0_0", "15-T2-s_0", "15-T2-x-r_6_0", "15-T2-x_6", "15-T2_0", "15-T3-r_1_0", "15-T3-r_1_1", "15-T3-r_3_0", "15-T3-r_3_1", "15-T3-s_0", "15-T3-s_7", "15-T3-x-r_0_0", "15-T3-x-r_0_1", "15-T3-x-r_3_0", "15-T3-x-r_3_1", "15-T3-x-r_6_0", "15-T3-x-r_6_1", "15-T3-x_0", "15-T3-x_3", "15-T3-x_6", "15-T3_0", "15-T3_1", "15-T3_3", "15-T4-x-r_3_0", "15-T4-x-r_3_1", "15-T4-x_3", "16-1-r_0_0", "16-1-r_0_1", "16-1-r_2_1", "16-1_0", "16-T1-r_11_0", "16-T1-r_11_1", "16-T1-r_7_0", "16-T1-r_7_1", "16-T1-r_9_0", "16-T1-x-r_0_0", "16-T1-x-r_0_1", "16-T1-x-r_2_0", "16-T1-x_0", "16-T1-x_2", "16-T1_11", "16-T1_7", "16-T1_9", "16-T2-r_4_1", "16-T2-x-r_0_1", "16-T3-r_16_1", "17-1-r_6_0", "17-1-r_6_1", "17-1_6", "17-2-r_3_0", "17-2-r_3_1", "17-2-r_5_0", "17-2-r_5_1", "17-2-s_5", "17-2_3", "17-2_5", "17-T1-x-r_6_0", "17-T1-x-r_6_1", "17-T1-x_6", "17-T3-r_1_0", "17-T3-r_1_1", "17-T3-x-r_0_0", "17-T3-x-r_0_1", "17-T3-x_0", "17-T3_1", "18-1-r_1_0", "18-1-r_1_1", "18-1-r_2_0", "18-1-r_2_1", "18-1-s_1", "18-1_1", "18-1_2", "18-2-r_5_1", "18-C1-r_3_0", "18-C1-r_3_1", "18-C1-r_5_0", "18-C1-r_5_1", "18-C1-r_7_0", "18-C1-r_7_1", "18-C1-r_8_0", "18-C1-r_8_1", "18-C1-s_1", "18-C1-x-r_1_0", "18-C1-x-r_3_0", "18-C1-x-r_3_1", "18-C1-x-r_4_0", "18-C1-x-r_4_1", "18-C1-x_1", "18-C1-x_3", "18-C1-x_4", "18-C1_3", "18-C1_5", "18-C1_7", "18-C1_8", "18-C2-x-r_3_0", "18-C2-x_3", "18-T1-r_12_0", "18-T1-r_12_1", "18-T1-r_5_0", "18-T1-r_8_0", "18-T1-r_8_1", "18-T1-r_9_0", "18-T1-r_9_1", "18-T1-s_13", "18-T1-s_5", "18-T1-s_7", "18-T1-s_9", "18-T1-x-r_1_0", "18-T1-x-r_2_1", "18-T1-x_1", "18-T1_12", "18-T1_5", "18-T1_8", "18-T1_9", "2-1-r_0_0", "2-1-r_0_1", "2-1-r_2_0", "2-1-r_4_0", "2-1-r_4_1", "2-1-r_6_0", "2-1-r_6_1", "2-1_0", "2-1_2", "2-1_4", "2-1_6", "2-2-r_0_0", "2-2-r_2_0", "2-2-r_3_0", "2-2-r_5_0", "2-2-r_5_1", "2-2_0", "2-2_5", "2-T1-x-r_0_0", "2-T1-x-r_0_1", "2-T1-x-r_1_0", "2-T1-x-r_3_0", "2-T1-x-r_4_1", "2-T1-x-r_6_0", "2-T1-x-r_6_1", "2-T1-x_0", "2-T1-x_3", "2-T1-x_6", "2-T2-r_3_0", "2-T2-r_4_1", "2-T2-x-r_0_0", "2-T2-x-r_1_0", "2-T2-x-r_3_0", "2-T2-x-r_3_1", "2-T2-x-r_5_0", "2-T2-x-r_5_1", "2-T2-x-r_7_0", "2-T2-x-r_8_1", "2-T2-x_0", "2-T2-x_3", "2-T2-x_5", "2-T2-x_7", "2-T2_3", "3-1-r_2_0", "3-1-r_2_1", "3-1_2", "3-2-r_0_0", "3-2-r_0_1", "3-2_0", "3-T1-r_0_0", "3-T1-r_0_1", "3-T1-x-r_0_0", "3-T1-x-r_0_1", "3-T1-x-r_6_0", "3-T1-x-r_6_1", "3-T1-x_0", "3-T1-x_6", "3-T1_0", "4-1-r_0_0", "4-2-r_0_0", "4-2-r_0_1", "4-2-r_1_0", "4-2-r_1_1", "4-2-r_4_0", "4-2_0", "4-2_1", "4-T1-x-r_3_0", "4-T1-x-r_6_0", "4-T2-r_1_0", "4-T2-r_1_1", "4-T2-r_3_0", "4-T2-r_5_0", "4-T2-r_5_1", "4-T2-x-r_0_0", "4-T2-x-r_0_1", "4-T2-x-r_2_0", "4-T2-x-r_4_0", "4-T2-x-r_4_1", "4-T2-x-r_7_0", "4-T2-x-r_7_1", "4-T2-x_0", "4-T2-x_4", "4-T2-x_7", "4-T2_1", "4-T2_3", "4-T2_5", "5-1-r_2_0", "5-1-r_2_1", "5-1-r_4_1", "5-1-r_6_0", "5-1-r_6_1", "5-1_2", "5-1_6", "5-2-r_0_0", "5-2-r_0_1", "5-2-r_2_0", "5-2-r_2_1", "5-2_0", "5-2_2", "5-T1-x-r_6_0", "5-T1-x-r_6_1", "5-T1-x_6", "5-T2-r_4_0", "5-T2-r_4_1", "5-T2-x-r_0_0", "5-T2-x-r_3_0", "5-T2-x-r_3_1", "5-T2-x-r_5_0", "5-T2-x-r_7_0", "5-T2-x-r_7_1", "5-T2-x-r_9_0", "5-T2-x-r_9_1", "5-T2-x_0", "5-T2-x_3", "5-T2-x_5", "5-T2-x_7", "5-T2-x_9", "5-T2_4", "6-1-r_2_1", "6-1-r_4_0", "6-1-r_4_1", "6-1-r_6_1", "6-1_4", "6-2-r_0_0", "6-2-r_0_1", "6-2-r_2_0", "6-2-r_2_1", "6-2-r_3_1", "6-2-r_5_0", "6-2-r_5_1", "6-2_0", "6-2_2", "6-T1-r_13_0", "6-T1-r_13_1", "6-T1-x-r_4_0", "6-T1-x-r_7_0", "6-T1_13", "6-T2-r_0_0", "6-T2-r_0_1", "6-T2-r_4_0", "6-T2-r_4_1", "6-T2-r_5_1", "6-T2-s_5", "6-T2-x-r_0_0", "6-T2-x-r_0_1", "6-T2-x-r_1_0", "6-T2-x-r_3_0", "6-T2-x-r_3_1", "6-T2-x-r_6_1", "6-T2-x_0", "6-T2-x_3", "6-T2_0", "6-T2_4", "6-T2_5", "6-T3-x-r_0_0", "6-T3-x-r_0_1", "6-T3-x-r_2_0", "6-T3-x-r_2_1", "6-T3-x-r_4_0", "6-T3-x-r_4_1", "6-T3-x_0", "6-T3-x_2", "6-T3-x_4", "7-1-r_1_0", "7-1-r_1_1", "7-1-r_3_0", "7-1-r_3_1", "7-1-r_5_0", "7-1-r_5_1", "7-1_1", "7-1_3", "7-1_5", "7-T1-r_10_0", "7-T1-r_14_1", "7-T1-r_6_0", "7-T1-r_8_0", "7-T1-r_8_1", "7-T1-s_3", "7-T1-s_5", "7-T1-x-r_1_0", "7-T1-x-r_1_1", "7-T1-x-r_3_0", "7-T1-x-r_7_1", "7-T1-x-r_8_0", "7-T1-x-r_8_1", "7-T1-x_1", "7-T1-x_3", "7-T1-x_8", "7-T1_10", "7-T1_6", "7-T1_8", "7-T2-r_0_0", "7-T2-r_0_1", "7-T2-r_2_0", "7-T2-r_2_1", "7-T2-r_6_1", "7-T2-x-r_0_0", "7-T2-x-r_0_1", "7-T2-x-r_4_0", "7-T2-x-r_4_1", "7-T2-x-r_6_0", "7-T2-x-r_6_1", "7-T2-x_0", "7-T2-x_4", "7-T2-x_6", "7-T2_0", "7-T2_2", "7-T3-r_10_0", "7-T3-r_10_1", "7-T3-s_9", "7-T3-x-r_7_0", "7-T3-x-r_7_1", "7-T3-x_7", "7-T3_10", "8-1-r_0_0", "8-1-r_2_0", "8-1-r_2_1", "8-1-r_4_1", "8-1-r_6_0", "8-1-s_1", "8-1-s_5", "8-1_0", "8-1_2", "8-1_4", "8-1_6", "8-2-r_0_0", "8-2-r_2_0", "8-2-r_4_1", "8-2_0", "8-T1-x-r_0_0", "8-T1-x-r_2_1", "8-T1-x-r_4_0", "8-T1-x-r_7_0", "8-T1-x-r_9_0", "8-T1-x_0", "8-T1-x_2", "8-T1-x_4", "8-T1-x_7", "8-T1_10", "8-T1_12", "8-T1_4", "8-T1_6", "8-T1_8", "8-T2-r_0_1", "8-T2-r_2_0", "8-T2-r_2_1", "8-T2-r_5_1", "8-T2-x-r_4_0", "8-T2-x-r_6_0", "8-T2-x-r_8_1", "8-T2-x_4", "8-T2-x_6", "8-T2_0", "8-T2_2", "9-2-r_0_0", "9-T1-r_3_0", "9-T1-r_3_1", "9-T1_3", "9-T2-r_4_0", "9-T2-r_4_1", "9-T2-x-r_0_0", "9-T2-x-r_6_0", "9-T2_4", "9-T3-r_6_1", "9-T3-x-r_2_0", "g0-3_0", "g0-3_4", "g0-3_9", "g0-4_0", "g1-3_3", "g1-4_0", "g1-4_2", "g1-4_4", "g1-4_6", "g1-5_0", "g1-5_2", "g1-5_4", "g1-5_8", "g1-6_0", "g10-1_11", "g10-1_8", "g10-2_1", "g10-2_3", "g10-2_5", "g11-3_3", "g11-4_2", "g11-4_5", "g11-5_1", "g11-5_4", "g12-1_1", "g13-1_3", "g13-1_6", "g13-3_12", "g13-3_3", "g13-3_5", "g13-4_0", "g13-4_10", "g13-4_13", "g13-4_3", "g13-4_6", "g13-5_0", "g13-5_6", "g13-6_0", "g13-6_10", "g13-6_5", "g13-6_7", "g13-6_9", "g14-3_3", "g14-4_1", "g14-4_3", "g14-4_6", "g14-4_8", "g15-1_0", "g15-1_2", "g15-1_4", "g15-1_7", "g15-2_0", "g15-2_10", "g15-2_2", "g15-2_4", "g15-2_6", "g15-2_8", "g15-3_0", "g15-3_2", "g15-3_4", "g15-4_1", "g15-4_3", "g15-5_0", "g15-5_11", "g15-5_14", "g15-5_2", "g15-5_4", "g15-5_6", "g15-5_8", "g15-6_2", "g15-7_4", "g16-1_1", "g16-1_16", "g16-1_3", "g16-1_5", "g16-1_7", "g16-2_11", "g16-2_13", "g16-3_6", "g16-5_3", "g16-6_6", "g16-6_8", "g17-3_13", "g17-3_15", "g17-3_17", "g17-4_5", "g17-5_0", "g17-5_11", "g17-5_2", "g17-5_8", "g18-2_2", "g18-2_6", "g18-2_7", "g18-3_0", "g18-3_16", "g18-3_17", "g18-3_3", "g18-3_4", "g18-3_6", "g18-3_7", "g18-3_9", "g18-4_10", "g18-4_13", "g18-4_9", "g18-6_5", "g18-6_6", "g2-1_0", "g2-1_11", "g2-1_12", "g2-1_9", "g2-3_0", "g2-3_5", "g2-4_0", "g2-4_4", "g2-5_0", "g2-5_2", "g2-5_6", "g2-5_9", "g2-6_5", "g2-6_7", "g3-2_0", "g3-2_2", "g3-2_6", "g3-3_3", "g3-3_5", "g3-3_7", "g3-4_1", "g3-4_5", "g4-4_3", "g4-4_5", "g4-4_7", "g4-5_0", "g4-5_1", "g4-5_3", "g4-6_0", "g4-6_2", "g4-6_4", "g4-6_6", "g5-3_0", "g5-3_10", "g5-3_2", "g5-3_4", "g5-3_6", "g5-3_8", "g5-4_0", "g5-4_2", "g5-4_4", "g5-4_6", "g5-4_8", "g6-2_1", "g6-2_3", "g6-4_0", "g6-4_12", "g6-4_2", "g6-4_5", "g6-4_8", "g6-7_1", "g6-7_9", "g7-1_22", "g7-1_7", "g7-2_1", "g7-2_3", "g7-2_5", "g7-4_0", "g7-4_4", "g7-4_7", "g7-5_2", "g8-1_0", "g8-1_10", "g8-1_12", "g8-1_14", "g8-1_2", "g8-1_5", "g8-1_8", "g8-2_0", "g8-2_5", "g8-2_7", "g8-2_9", "g8-3_2", "g8-4_2", "g8-5_11", "g8-5_7", "g8-5_9", "g8-7_10", "g8-7_12", "g8-7_14", "g8-7_5", "g8-7_8", "g8-8_1", "g8-8_11", "g8-8_13", "g8-8_5", "g8-8_7", "g8-8_9", "g9-6_3"]);
async function cacheAudio(){
  const c = await caches.open(AUDIO);
  for (let i = 0; i < AUDIO_FILES.length; i += 10) {
    await Promise.allSettled(AUDIO_FILES.slice(i, i + 10).map(async u => { if (!(await c.match(u))) { const r = await fetch(u, {cache: 'no-cache'}); if (r.ok) await c.put(u, r); } }));
  }
}
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL); await c.addAll(SHELL_FILES);
    // v3.43 起：新版裝好後先「等待」，頁面上方顯示「有新版本」，使用者按「更新」才接手（不會在聽到一半時突然重新整理）。
    // 第一次安裝，或是從 v91（3.42）以前的舊版升級（舊頁面沒有提示列）→ 照舊直接接手，舊頁面會自己重新整理一次。
    const olds = (await caches.keys()).map(k => /^nh-shell-v(\d+)$/.exec(k)).filter(m => m && m[0] !== SHELL).map(m => +m[1]);
    if (!olds.length || Math.max(...olds) < 92) await self.skipWaiting();
  })());
});
self.addEventListener('message', e => {
  const m = e.data || {};
  if (m === 'skipWaiting' || m.type === 'skipWaiting') self.skipWaiting();
  else if (m.type === 'ver' && e.ports && e.ports[0]) e.ports[0].postMessage({v: APP_VER, sw: SHELL});
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // v8 -> v9: only new files (逐句 audio/<id>-s_*) were added; carry everything over
    // v7 -> v8: only 本文 audio (audio/<n>-T<m>_*) changed (one file per speaker turn now); carry everything else over
    // (v6 -> v8: drill audio audio/g* changed too)
    for (const [old, changed] of [['nh-audio-v8', /(?!)/], ['nh-audio-v7', /\/\d+-T\d+_/], ['nh-audio-v6', /\/(\d+-T\d+|g\d+-\d+)_/]]) {
      if (!(await caches.has(old))) continue;
      const o = await caches.open(old), n = await caches.open(AUDIO);
      for (const r of await o.keys()) if (!changed.test(new URL(r.url).pathname) && !(await n.match(r))) await n.put(r, await o.match(r));
    }
    // v3.22 one-time purge: only when upgrading from a shell older than v71 (240px 單語插圖); later updates keep the image cache
    const pre322 = (await caches.keys()).some(k => { const m = /^nh-shell-v(\d+)$/.exec(k); return m && +m[1] < 71; });
    // v3.25: 第10課 #21・#29 插圖重畫；從 v74 以前升級時只刪這兩張舊圖
    const pre325 = (await caches.keys()).some(k => { const m = /^nh-shell-v(\d+)$/.exec(k); return m && +m[1] < 74; });
    // v3.47／v3.48 聲調修正：重新產生的音檔（檔名不變），從舊版升級時只刪這些舊檔，cacheAudio() 會重新下載
    const prevShell = Math.max(0, ...(await caches.keys()).map(k => /^nh-shell-v(\d+)$/.exec(k)).filter(m => m && m[0] !== SHELL).map(m => +m[1]));
    if (prevShell && prevShell < 97 && await caches.has(AUDIO)) {
      const ac = await caches.open(AUDIO);
      for (const r of await ac.keys()) { const m = /\/audio\/(.+?)(?:_s)?\.mp3$/.exec(new URL(r.url).pathname); if (m && ((prevShell < 96 && REAUDIO_347.has(m[1])) || REAUDIO_348.has(m[1]))) await ac.delete(r); }
    }
    for (const k of await caches.keys()) if (![SHELL, AUDIO, PAGES].includes(k)) await caches.delete(k);
    if (pre322 && await caches.has(PAGES)) {
      const pc = await caches.open(PAGES);
      for (const r of await pc.keys()) if (/\/pages\/tango\/img\//.test(new URL(r.url).pathname)) await pc.delete(r);
    }
    if (pre322 && await caches.has(SHELL)) {
      const sc = await caches.open(SHELL);
      for (const r of await sc.keys()) if (/\/pages\/tango\/img\//.test(new URL(r.url).pathname)) await sc.delete(r);
    }
    if (pre325) for (const name of [PAGES, SHELL]) {
      if (!(await caches.has(name))) continue;
      const pc = await caches.open(name);
      for (const r of await pc.keys()) if (/\/pages\/tango\/img\/10-(20|28)\.webp$/.test(new URL(r.url).pathname)) await pc.delete(r);
    }
    await self.clients.claim();
    cacheAudio().catch(() => {});
  })());
});
// iOS Safari asks for media with Range headers; answer with 206 from the cached file
async function rangeResponse(req, res){
  const range = req.headers.get('range');
  if (!range) return res;
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const start = m[1] ? +m[1] : 0, end = m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), {status: 206, statusText: 'Partial Content', headers: {
    'Content-Type': 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes'}});
}
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Never intercept Firebase Auth / Firestore / the official JS SDK (gstatic) or Google accounts.
  // Intercepting these would break sign-in, especially iOS home-screen PWA redirects.
  if (/google(?:apis)?\.com$|gstatic\.com$|firebaseio\.com$|firebaseapp\.com$|googleapis\.com$/.test(url.hostname)) return;
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('/version.json')) return;   // 檢查新版本：一律走網路，不快取
  if (url.pathname.endsWith('.mp3')) {
    e.respondWith((async () => {
      const c = await caches.open(AUDIO);
      const hit = await c.match(url.pathname.replace(/^.*\/audio\//, 'audio/')) || await c.match(e.request);
      if (hit) return rangeResponse(e.request, hit);
      try {
        const full = await fetch(url.pathname, {credentials: 'same-origin', cache: 'no-cache'});
        if (full.ok && full.status === 200) { await c.put(url.pathname.replace(/^.*\/audio\//, 'audio/'), full.clone()); return rangeResponse(e.request, full); }
      } catch (err) {}
      return fetch(e.request);
    })());
    return;
  }
  // textbook page images + section crops: cache on view (not precached)
  if (/\/pages\/(p\d+|(?:sec|blk)\/[^/]+|tango\/(?:img\/)?[^/]+)\.webp$/.test(url.pathname)) {
    e.respondWith((async () => {
      const c = await caches.open(PAGES);
      const key = url.pathname.replace(/^.*\/pages\//, 'pages/');
      const hit = await c.match(key);
      if (hit) return hit;
      try {
        const r = await fetch(e.request);
        if (r.ok && r.status === 200) c.put(key, r.clone());
        return r;
      } catch (err) { return new Response('', {status: 504, statusText: 'offline'}); }
    })());
    return;
  }
  // shell: network-first (revalidated, so a new deploy shows on the next reload); offline or slow (>3 s) → cached copy
  e.respondWith((async () => {
    const c = await caches.open(SHELL);
    const net = fetch(e.request, {cache: 'no-cache'}).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    const hit = await c.match(e.request, {ignoreSearch: true});
    if (!hit) return (await net) || (await c.match('index.html'));
    const r = await Promise.race([net, new Promise(res => setTimeout(() => res(null), 3000))]);
    return (r && r.ok) ? r : hit;
  })());
});
