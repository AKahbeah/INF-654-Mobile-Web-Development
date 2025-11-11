// Firebase helper: dynamically loads Firebase (if config provided) and exposes basic Firestore CRUD
(function(global){
  let firebaseApp = null;
  let firestore = null;
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

      firebaseApp = window.firebase.initializeApp(window.FIREBASE_CONFIG);
      firestore = window.firebase.firestore();
      ready = true;
      console.info('Firebase initialized');
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

    async addTask(task){
      if (!await fb.ensure()) throw new Error('Firebase not ready');
      // Use provided id if exists, else let Firestore generate one and return the id
      const col = firestore.collection('tasks');
      if (task.id) {
        await col.doc(task.id).set(task);
        return task;
      }
      const docRef = await col.add(task);
      task.id = docRef.id;
      await col.doc(task.id).set(task);
      return task;
    },

    async updateTask(id, patch){
      if (!await fb.ensure()) throw new Error('Firebase not ready');
      const col = firestore.collection('tasks');
      await col.doc(id).set(patch, { merge: true });
      return await col.doc(id).get().then(d=> ({ id: d.id, ...d.data() }));
    },

    async deleteTask(id){
      if (!await fb.ensure()) throw new Error('Firebase not ready');
      const col = firestore.collection('tasks');
      await col.doc(id).delete();
    },

    async getAllTasks(){
      if (!await fb.ensure()) throw new Error('Firebase not ready');
      const col = firestore.collection('tasks');
      const snap = await col.get();
      const arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      return arr;
    }
  };

  // Expose but don't force initialization — user must provide config file
  global.FirebaseHelper = fb;
})(window);
