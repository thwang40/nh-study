/* 撿角日語 — Firebase 網頁設定。
   專案還沒開好之前請保持 null：登入按鈕會完全隱藏，App 行為與現在相同，也不會載入 Firebase SDK。

   專案開好後，把 window.FB_CONFIG 改成 Firebase 主控台
   「專案設定 → 您的應用程式 → SDK 設定和設定」裡的 firebaseConfig 物件，欄位包含：
     apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId
   authDomain 一般是 <projectId>.firebaseapp.com。

   Authentication → Settings → Authorized domains 必須加上：
     thwang40.github.io
   （localhost 預設已有，本機測試用。）

   另外請啟用 Authentication 的 Google 提供者，並把 firestore.rules 貼到
   Firestore → 規則。
*/
window.FB_CONFIG = null;
