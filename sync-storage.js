// High-level storage manager that uses Firebase when online and IndexedDB when offline.
// It also queues operations performed offline and attempts to sync them when back online.
(function(global){
  const using = {
    async isOnline(){
      return navigator.onLine && !!window.FIREBASE_CONFIG;
    }
  };

  // utility to generate a client id (used when creating records offline)
  function genId(){
    // simple unique id — can be replaced with more robust uuid
    return 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,9);
  }

  const StorageManager = {
    async createTask(record){
      // ensure id
      if (!record.id) record.id = genId();
      record._updatedAt = new Date().toISOString();

      if (navigator.onLine && window.FIREBASE_CONFIG) {
        try {
          const saved = await FirebaseHelper.addTask(record);
          // keep a local copy too
          await IDBHelper.putTask(saved);
          return saved;
        } catch (err) {
          console.warn('Firebase add failed, falling back to IndexedDB:', err);
        }
      }

      // offline path: store locally and enqueue sync
      await IDBHelper.putTask(record);
      await IDBHelper.enqueue({ type: 'add', record });
      return record;
    },

    async updateTask(id, patch){
      patch._updatedAt = new Date().toISOString();
      if (navigator.onLine && window.FIREBASE_CONFIG) {
        try {
          const updated = await FirebaseHelper.updateTask(id, patch);
          await IDBHelper.putTask(updated);
          return updated;
        } catch (err) {
          console.warn('Firebase update failed, enqueueing:', err);
        }
      }

      // offline
      const existing = await IDBHelper.getTask(id) || {};
      const merged = Object.assign({}, existing, patch, { id });
      await IDBHelper.putTask(merged);
      await IDBHelper.enqueue({ type: 'update', record: merged });
      return merged;
    },

    async deleteTask(id){
      if (navigator.onLine && window.FIREBASE_CONFIG) {
        try {
          await FirebaseHelper.deleteTask(id);
          await IDBHelper.deleteTask(id);
          return;
        } catch (err) {
          console.warn('Firebase delete failed, enqueueing:', err);
        }
      }
      await IDBHelper.deleteTask(id);
      await IDBHelper.enqueue({ type: 'delete', record: { id } });
    },

    async getAllTasks(){
      if (navigator.onLine && window.FIREBASE_CONFIG) {
        try {
          const arr = await FirebaseHelper.getAllTasks();
          // refresh local copy
          for (const r of arr) await IDBHelper.putTask(r);
          return arr;
        } catch (err) {
          console.warn('Firebase read failed, falling back to IndexedDB:', err);
        }
      }
      return await IDBHelper.getAllTasks();
    },

    async syncFromQueue(){
      if (!navigator.onLine || !window.FIREBASE_CONFIG) {
        throw new Error('Not online or Firebase not configured');
      }
      // process queue sequentially
      await IDBHelper.drainQueue(async (op) => {
        if (op.type === 'add') {
          // if record already has a firebase-style id (not starting with c-), preserve it
          const rec = op.record;
          // let Firebase assign an id if the client id looks temporary
          if (rec.id && rec.id.startsWith('c-')) {
            // create in firebase and update local to new id
            const created = await FirebaseHelper.addTask(Object.assign({}, rec, { id: undefined }));
            // delete old local record and store new with firebase id
            await IDBHelper.deleteTask(rec.id);
            await IDBHelper.putTask(created);
          } else {
            await FirebaseHelper.addTask(rec);
          }
        } else if (op.type === 'update') {
          await FirebaseHelper.updateTask(op.record.id, op.record);
        } else if (op.type === 'delete') {
          await FirebaseHelper.deleteTask(op.record.id);
        }
      });

      // after draining, make sure local store reflects firebase
      const all = await FirebaseHelper.getAllTasks();
      // Overwrite local store with authoritative firebase snapshot
      for (const r of all) await IDBHelper.putTask(r);
      return all;
    }
  };

  // Auto-sync when connection is regained
  window.addEventListener('online', async () => {
    try {
      if (window.FIREBASE_CONFIG) {
        await StorageManager.syncFromQueue();
        if (typeof M !== 'undefined' && M.toast) M.toast({ html: 'Offline changes synced to Firebase.' });
      }
    } catch (err) {
      console.warn('Sync on reconnect failed:', err);
    }
  });

  global.StorageManager = StorageManager;
})(window);
