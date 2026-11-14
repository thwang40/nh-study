/* 撿角日語 — Firebase 網頁設定（專案 nh-study-sync）。
   這組值是 Firebase 網頁 SDK 的公開設定（安全靠 Authorized domains 與 Firestore 規則）。
   若改回 null，登入按鈕會完全隱藏，也不會載入 Firebase SDK。
   googleClientId：同源 OAuth 備用登入（iOS Safari 彈出視窗被擋時）用的 Web client。
*/
window.FB_CONFIG = {
  apiKey: "AIzaSyCpC_nPAG-t2HgnAw5szAf9_EhZTLXV-Uc",
  authDomain: "nh-study-sync.firebaseapp.com",
  projectId: "nh-study-sync",
  storageBucket: "nh-study-sync.firebasestorage.app",
  messagingSenderId: "677067855657",
  appId: "1:677067855657:web:f6374c477a8920a27c0938",
  googleClientId: "677067855657-nut9t7uikmflcd8i2vaudr6hdajg3go0.apps.googleusercontent.com"
};
