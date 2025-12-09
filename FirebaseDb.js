/* Minimal Firebase config shim for firebase-helper.js
   This file exposes the config as window.FIREBASE_CONFIG so the existing
   compat-based `firebase-helper.js` can initialize itself. Keep the
   actual values here (do not commit sensitive production creds). */

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCMUakp9jGlZQgkZHag1N-pgGqad3aO3Xc",
  authDomain: "task-manager-3eda6.firebaseapp.com",
  projectId: "task-manager-3eda6",
  storageBucket: "task-manager-3eda6.firebasestorage.app",
  messagingSenderId: "195803715580",
  appId: "1:195803715580:web:9e8f0d22e1fbe5edbdc479",
  measurementId: "G-WX6Y33E4HC"
};

// Note: `firebase-helper.js` will dynamically load the Firebase compat scripts
// and initialize using window.FIREBASE_CONFIG. If you prefer the modular SDK
// approach, we can rewrite the helper later.
