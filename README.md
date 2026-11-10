# 文化日本語 聽力練習（第1～14課）PWA

Live: https://bunka-nihongo-1d0c0.deed.page/

- Textbook: 《文化初級日本語Ⅰ テキスト 改訂版》(文化外国語専門学校 編, 凡人社, 2013)
- Lesson titles: 凡人社 official TOC PDF https://publishing.bonjinsha.co.jp/wp/wp-content/uploads/2015/11/bunka_1_index.pdf
- 文型 list: 文化外国語専門学校 紀要 資料2「文型意味一覧」 https://www.bunka-bi.ac.jp/wp-content/uploads/2018/03/004031328_01.pdf
- 文型対照表 (新文化 vs 改訂版): https://publishing.bonjinsha.co.jp/wp/wp-content/uploads/2015/11/bunkagatataiou.pdf
- Vocabulary (繁體中文): https://publishing.bonjinsha.co.jp/wp/wp-content/uploads/2015/11/word_list_english-chinese.pdf
- Dialogues are original practice material written for this app (not textbook text). Audio: edge-tts ja-JP-NanamiNeural / KeitaNeural (normal + -30% slow).

Files: data.js (lessons, grammar, vocab, 24 dialogues), app.js, style.css, sw.js, manifest.webmanifest, audio/*.mp3
Tools: tools/gen_audio.py (needs /workspace/.ttsvenv with edge-tts), tools/validate.js, tools/deploy_deed.sh
Redeploy: SLUG=$(cat <store>/bunka-nihongo-app/deed_slug) TOKFILE=<store>/bunka-nihongo-app/deed_token ./tools/deploy_deed.sh
(store = /cursor/stores/store-5b7e0ff1-002f-4f55-ac4f-4c62700a3452). Bump cache names in sw.js when changing shell files.

## v2（依使用者課本 PDF 重建）
- 內容來源：tools/content/*.py（課本原文本文 28 段＋自編實用會話 24 段），`tools/build_data.py` 產生 data.js（假名用 fugashi/unidic 自動標註＋手動修正）。
- 音檔：`tools/gen_audio.py` 產生後以 ffmpeg 轉 32kbps 單聲道（全部約 15 MB，符合 deed.page 25 MB 上限）。
- 部署：`REPLACE=1 SLUG=... TOKFILE=... ./tools/deploy_deed.sh`（第一包整站取代，清掉舊檔）。
