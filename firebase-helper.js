// Firebase helper: dynamically loads Firebase (if config provided) and exposes basic Firestore CRUD
(function(global){
  let firebaseApp = null;
  let firestore = null;
  let auth = null;
  let ready = false;

  async function loadScript(src){
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function init(){
    // require user-provided config at window.FIREBASE_CONFIG
    if (!window.FIREBASE_CONFIG) {
      console.info('Firebase config not found (window.FIREBASE_CONFIG). Firebase will be disabled.');
      return;
    }

    try {
      // Load modular CDN (compat layer) — using compat for simpler API in this prototype
      await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
  await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');
  await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js');

      firebaseApp = window.firebase.initializeApp(window.FIREBASE_CONFIG);
      firestore = window.firebase.firestore();
      try { auth = window.firebase.auth(); } catch (e) { /* ignore */ }
      ready = true;
      console.info('Firebase initialized (firestore + auth)');
    } catch (err) {
      console.warn('Failed to load/initialize Firebase:', err);
    }
  }

  // CRUD operations for a collection (default 'tasks')
  const fb = {
    async ensure(){
      if (!ready) await init();
      return ready;
    },

    // Auth helpers
    async signInWithGoogle(){
      if (!await fb.ensure()) throw new Error('Firebase not ready');
      if (!auth) throw new Error('Auth not available');
      const provider = new window.firebase.auth.GoogleAuthProvider();
      return auth.signInWithPopup(provider);
    },

    async signOut(){
      if (!await fb.ensure()) throw new Error('Firebase not ready');
      if (!auth) throw new Error('Auth not available');
      return auth.signOut();
    },

    onAuthStateChanged(cb){
      if (!window.firebase || !window.firebase.auth) return () => {};
      return window.firebase.auth().onAuthStateChanged(cb);
    },

    getCurrentUser(){
      if (!window.firebase || !window.firebase.auth) return null;
      return window.firebase.auth().currentUser;
    },

    // Per-user task CRUD: store under users/{uid}/tasks
    async addTask(uid, task){
      if (!await fb.ensure()) throw new Error('Firebase not ready');
      if (!uid) throw new Error('User ID required');
      const col = firestore.collection('users').doc(uid).collection('tasks');
      if (task.id && !task.id.startsWith('c-')) {
        await col.doc(task.id).set(task);
        return task;
      }
      const data = Object.assign({}, task);
      if (data.id && data.id.startsWith('c-')) delete data.id;
      const docRef = await col.add(data);
      data.id = docRef.id;
      await col.doc(data.id).set(data);
      return data;
    },

    async updateTask(uid, id, patch){
      if (!await fb.ensure()) throw new Error('Firebase not ready');
      if (!uid) throw new Error('User ID required');
      const docRef = firestore.collection('users').doc(uid).collection('tasks').doc(id);
      await docRef.set(patch, { merge: true });
      const d = await docRef.get();
      return { id: d.id, ...d.data() };
    },

    async deleteTask(uid, id){
      if (!await fb.ensure()) throw new Error('Firebase not ready');
      if (!uid) throw new Error('User ID required');
      await firestore.collection('users').doc(uid).collection('tasks').doc(id).delete();
    },

    async getAllTasks(uid){
      if (!await fb.ensure()) throw new Error('Firebase not ready');
      if (!uid) throw new Error('User ID required');
      const col = firestore.collection('users').doc(uid).collection('tasks');
      const snap = await col.get();
      const arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      return arr;
    }
  };

  // Expose but don't force initialization — user must provide config file
  global.FirebaseHelper = fb;
})(window);
