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
    _userId: null,

    setUser(userOrUid){
      if (!userOrUid) {
        this._userId = null; return;
      }
      this._userId = (typeof userOrUid === 'string') ? userOrUid : (userOrUid.uid || userOrUid.id || null);
    },
    async createTask(record){
      // ensure id
      if (!record.id) record.id = genId();
      record._updatedAt = new Date().toISOString();

      if (navigator.onLine && window.FIREBASE_CONFIG && this._userId) {
        try {
          const saved = await FirebaseHelper.addTask(this._userId, record);
          // keep a local copy too
          await IDBHelper.putTask(Object.assign({}, saved, { _userId: this._userId }));
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
      if (navigator.onLine && window.FIREBASE_CONFIG && this._userId) {
        try {
          const updated = await FirebaseHelper.updateTask(this._userId, id, patch);
          await IDBHelper.putTask(Object.assign({}, updated, { _userId: this._userId }));
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
      if (navigator.onLine && window.FIREBASE_CONFIG && this._userId) {
        try {
          await FirebaseHelper.deleteTask(this._userId, id);
          await IDBHelper.deleteTask(id);
          return;
        } catch (err) {
          console.warn('Firebase delete failed, enqueueing:', err);
        }
      }
      await IDBHelper.deleteTask(id);
      await IDBHelper.enqueue({ type: 'delete', record: { id, _userId: this._userId } });
    },

    async getAllTasks(){
      if (navigator.onLine && window.FIREBASE_CONFIG && this._userId) {
        try {
          const arr = await FirebaseHelper.getAllTasks(this._userId);
          // refresh local copy (only for this user)
          await IDBHelper.clearTasks();
          for (const r of arr) await IDBHelper.putTask(Object.assign({}, r, { _userId: this._userId }));
          return arr;
        } catch (err) {
          console.warn('Firebase read failed, falling back to IndexedDB:', err);
        }
      }
      // offline: filter local tasks by _userId
      const all = await IDBHelper.getAllTasks();
      if (this._userId) return all.filter(t => t._userId === this._userId);
      return all;
    },

    async syncFromQueue(){
      if (!navigator.onLine || !window.FIREBASE_CONFIG || !this._userId) {
        throw new Error('Not online or Firebase not configured');
      }
      // process queue sequentially
      await IDBHelper.drainQueue(async (op) => {
        if (op.type === 'add') {
          // if record already has a firebase-style id (not starting with c-), preserve it
          const rec = op.record;
          // ensure correct user id on the record
          const uid = rec._userId || this._userId;
          if (!uid) throw new Error('No user id for queued add');
          if (rec.id && rec.id.startsWith('c-')) {
            const created = await FirebaseHelper.addTask(uid, Object.assign({}, rec, { id: undefined }));
            await IDBHelper.deleteTask(rec.id);
            await IDBHelper.putTask(Object.assign({}, created, { _userId: uid }));
          } else {
            await FirebaseHelper.addTask(uid, rec);
          }
        } else if (op.type === 'update') {
          const uid = op.record._userId || this._userId;
          if (!uid) throw new Error('No user id for queued update');
          await FirebaseHelper.updateTask(uid, op.record.id, op.record);
        } else if (op.type === 'delete') {
          const uid = op.record._userId || this._userId;
          if (!uid) throw new Error('No user id for queued delete');
          await FirebaseHelper.deleteTask(uid, op.record.id);
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
