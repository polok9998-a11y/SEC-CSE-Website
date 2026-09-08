// ============================================================
// FIREBASE CONFIGURATION — SEC CSE Batch 2026 Notice System
// ============================================================
// This file connects the website to YOUR Firebase project
// (Firestore database + Authentication).
//
// ─── WHAT YOU MUST EDIT ─────────────────────────────────────
// Replace the six YOUR_FIREBASE_* placeholders below with the
// values from: Firebase Console → Project settings →
// "Your apps" → Web app → SDK setup and configuration.
//
// These Web App config values are NOT secrets — they are
// designed to be public. Database security is enforced by
// firestore.rules (Security Rules), never by hiding this file.
//
// NEVER put anything else here: no passwords, no private keys,
// no service-account credentials.
//
// Full instructions: see FIREBASE-SETUP.md
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyAtKFmKruiG59FQ_HQls972KC8bWyvtSGQ",
  authDomain: "student-notice-board-33c3a.firebaseapp.com",
  projectId: "student-notice-board-33c3a",
  storageBucket: "student-notice-board-33c3a.firebasestorage.app",
  messagingSenderId: "443898490438",
  appId: "1:443898490438:web:d7a0e30fc74013d7d9a447"
};

// ─── ADMIN UID WHITELIST ────────────────────────────────────
// Replace YOUR_ADMIN_UID with the UID of your Firebase Auth
// admin user (Firebase Console → Authentication → Users →
// "User UID" column).
//
// This list is used ONLY to show/hide the Admin Panel UI.
// Real security is enforced by firestore.rules — anyone not
// listed here cannot write to the database even if they edit
// this file or the frontend code.
//
// You can add more admins later by adding more UIDs to the array.
const ADMIN_UIDS = [
  "ASoDradWjJhgYA7a73q091YOSeY2"
];

console.log('[Firebase] Project:', firebaseConfig.projectId, '| Expected admin UIDs:', ADMIN_UIDS);

// ============================================================
// Everything below initialises Firebase and exposes a small
// API (window.NoticeFirebase) for the rest of the site.
// You normally do NOT need to change anything below this line.
// ============================================================

(function () {
  "use strict";

  const PLACEHOLDER_VALUES = [];

  function isPlaceholder(value) {
    return typeof value !== "string" ||
      value.trim() === "" ||
      value.indexOf("YOUR_") === 0;
  }

  // True only when every required value has been replaced.
  const missing = Object.keys(firebaseConfig).filter(
    key => isPlaceholder(firebaseConfig[key])
  );
  const adminPending = ADMIN_UIDS.some(uid => PLACEHOLDER_VALUES.indexOf(uid) !== -1);
  const configured = missing.length === 0;

  function fail(reason) {
    // Graceful degradation: pages keep working, NoticeStore
    // reports an error state and shows a friendly message.
    console.warn("[Firebase] Not available:", reason);
    window.NoticeFirebase = {
      ready: false,
      configured: false,
      error: reason
    };
    document.dispatchEvent(new CustomEvent("noticefirebase:failed"));
  }

  if (!configured) {
    fail(
      "firebase-config.js still contains placeholder values" +
      (missing.length ? " (" + missing.join(", ") + ")" : "") +
      ". See FIREBASE-SETUP.md."
    );
    return;
  }

  if (adminPending) {
    console.warn(
      "[Firebase] ADMIN_UIDS still contains YOUR_ADMIN_UID. " +
      "The public site will work, but the Admin Panel will refuse access " +
      "until you replace it (see FIREBASE-SETUP.md)."
    );
  }

  // Modular Web SDK served from Google's CDN — compatible with
  // static hosting such as GitHub Pages (no build step needed).
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2";

  Promise.all([
    import(SDK + "/firebase-app.js"),
    import(SDK + "/firebase-firestore.js"),
    import(SDK + "/firebase-auth.js")
  ]).then(modules => {
    const app = modules[0];
    const fs = modules[1];
    const authMod = modules[2];

    const firebaseApp = app.initializeApp(firebaseConfig);
    const db = fs.getFirestore(firebaseApp);
    const auth = authMod.getAuth(firebaseApp);

    console.log('[Firebase] App initialised — project:', firebaseConfig.projectId);
    console.log('[Firebase] Auth instance:', auth ? 'OK' : 'MISSING', '| Firestore instance:', db ? 'OK' : 'MISSING');
    console.log('[Firebase] Auth currentUser on init:', auth.currentUser ? auth.currentUser.uid : '(null — will resolve asynchronously)');

    // Listen for auth changes to log runtime UID
    authMod.onAuthStateChanged(auth, function (user) {
      if (user) {
        console.log('[Firebase] Auth user signed in — UID:', user.uid, '| Email:', user.email, '| Is expected admin:', ADMIN_UIDS.indexOf(user.uid) !== -1);
      } else {
        console.log('[Firebase] Auth state: no user signed in');
      }
    });

    window.NoticeFirebase = {
      ready: true,
      configured: true,
      error: null,

      // Instances
      app: firebaseApp,
      db: db,
      auth: auth,

      // Config
      ADMIN_UIDS: ADMIN_UIDS.filter(uid => !PLACEHOLDER_VALUES.includes(uid)),
      COLLECTION: "notices",

      // Firestore helpers used by notices-data.js
      fs: {
        collection: fs.collection,
        doc: fs.doc,
        getDoc: fs.getDoc,
        getDocs: fs.getDocs,
        setDoc: fs.setDoc,
        updateDoc: fs.updateDoc,
        deleteDoc: fs.deleteDoc,
        onSnapshot: fs.onSnapshot,
        serverTimestamp: fs.serverTimestamp
      },

      // Auth helpers used by the Admin Panel
      authApi: {
        onAuthStateChanged: authMod.onAuthStateChanged,
        signInWithEmailAndPassword: authMod.signInWithEmailAndPassword,
        signOut: authMod.signOut
      },

      // UX-only check (real security lives in firestore.rules)
      isAdminUid: function (uid) {
        return !!uid && ADMIN_UIDS.indexOf(uid) !== -1;
      }
    };

    document.dispatchEvent(new CustomEvent("noticefirebase:ready"));
  }).catch(err => {
    fail(err && err.message ? err.message : "Failed to load the Firebase SDK.");
  });
})();
