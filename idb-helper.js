// Simple IndexedDB helper for TaskNest
// Provides basic CRUD and a sync-queue for offline operations
(function(global){
  const DB_NAME = 'tasknest-db';
  const DB_VERSION = 1;
  const STORE_TASKS = 'tasks';
  const STORE_QUEUE = 'sync-queue';

  function openDB(){
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_TASKS)) {
          db.createObjectStore(STORE_TASKS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_QUEUE)) {
          db.createObjectStore(STORE_QUEUE, { autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function withStore(storeName, mode, cb){
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let result;
      try {
        result = cb(store);
      } catch (err) {
        reject(err);
      }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
    });
  }

  const idb = {
    async putTask(task){
      // task should have an `id` field (string)
      await withStore(STORE_TASKS, 'readwrite', store => store.put(task));
      return task;
    },

    async getAllTasks(){
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_TASKS, 'readonly');
        const store = tx.objectStore(STORE_TASKS);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    },

    async getTask(id){
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_TASKS, 'readonly');
        const store = tx.objectStore(STORE_TASKS);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    },

    async deleteTask(id){
      await withStore(STORE_TASKS, 'readwrite', store => store.delete(id));
    },

    // simple queue for operations to sync when back online
    async enqueue(op){
      // op: { type: 'add'|'update'|'delete', record: {...} }
      await withStore(STORE_QUEUE, 'readwrite', store => store.add(op));
    },

    async drainQueue(cbPerOp){
      // iterate queue, run cbPerOp(op) which should return promise
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_QUEUE], 'readwrite');
        const store = tx.objectStore(STORE_QUEUE);
        const req = store.openCursor();
        req.onsuccess = async (e) => {
          const cursor = e.target.result;
          if (!cursor) return; // done
          const op = cursor.value;
          try {
            await cbPerOp(op);
            cursor.delete();
            cursor.continue();
          } catch (err) {
            // stop processing on error so we can retry later
            reject(err);
          }
        };
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => resolve();
      });
    }
  };

  global.IDBHelper = idb;
})(window);
