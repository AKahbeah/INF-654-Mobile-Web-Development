// firebaseDB.js — populated from user-provided Firebase config.
// IMPORTANT: Do NOT commit this file to source control. It contains your
// project's client configuration and should remain local.

window.FIREBASE_CONFIG = {
	apiKey: "AIzaSyCMUakp9jGlZQgkZHag1N-pgGqad3aO3Xc",
	authDomain: "task-manager-3eda6.firebaseapp.com",
	projectId: "task-manager-3eda6",
	storageBucket: "task-manager-3eda6.firebasestorage.app",
	messagingSenderId: "195803715580",
	appId: "1:195803715580:web:9e8f0d22e1fbe5edbdc479",
	measurementId: "G-WX6Y33E4HC"
};

// For service worker compatibility (service workers don't have window):
try { self.FIREBASE_CONFIG = self.FIREBASE_CONFIG || window.FIREBASE_CONFIG; } catch(e) { /* noop */ }

console.info('firebaseDB.js loaded — window.FIREBASE_CONFIG set (do not commit this file)');
