document.addEventListener('DOMContentLoaded', () => {
  // Theme toggle
  const toggle = document.getElementById('dark-toggle');
  const savedTheme = localStorage.getItem('tasknest_theme') || 'light';

  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    if (toggle) toggle.checked = true;
  } else {
    document.body.classList.remove('dark-mode');
    if (toggle) toggle.checked = false;
  }

  if (toggle) {
    toggle.addEventListener('change', () => {
      const mode = toggle.checked ? 'dark' : 'light';
      localStorage.setItem('tasknest_theme', mode);
      if (mode === 'dark') {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    });
  }

  // (Optional) initialize Materialize components
  if (typeof M !== 'undefined' && M.AutoInit) {
    M.AutoInit();
  }

  // Service worker registration (ensure correct filename)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('serviceworker.js')
      .then(reg => console.log('Service Worker Registered', reg))
      .catch(err => console.error('Service Worker Failed', err));
  }

  // If Firebase config exists, load helpers (they'll initialize lazily)
  // Load IDB and sync helpers so pages can use StorageManager
  const loadHelpers = async () => {
    const scripts = ['idb-helper.js', 'firebase-helper.js', 'sync-storage.js'];
    for (const s of scripts) {
      const el = document.createElement('script');
      el.src = s;
      el.defer = true;
      document.head.appendChild(el);
    }
  };
  loadHelpers();

  // Wire Firebase auth UI and StorageManager user context once helpers load
  (async function wireAuthAndStorage(){
    // wait for helpers to be available
    const waitFor = async (testFn, timeout = 5000) => {
      const start = Date.now();
      return new Promise((resolve) => {
        (function poll(){
          try { if (testFn()) return resolve(true); } catch(e) {}
          if (Date.now() - start > timeout) return resolve(false);
          setTimeout(poll, 100);
        })();
      });
    };

    const ok = await waitFor(() => window.FirebaseHelper && window.StorageManager && window.IDBHelper, 8000);
    if (!ok) return;

    // update StorageManager when auth state changes
    window.FirebaseHelper.onAuthStateChanged(async (user) => {
      const authBtn = document.getElementById('auth-btn');
      const userEmail = document.getElementById('user-email');
      if (user) {
        if (authBtn) authBtn.textContent = 'Sign out';
        if (userEmail) userEmail.textContent = user.email || user.displayName || '';
        if (window.StorageManager && window.StorageManager.setUser) window.StorageManager.setUser(user.uid || user);
        // attempt to sync queued operations for this user
        try { await window.StorageManager.syncFromQueue(); } catch(e) { console.warn('Sync after sign-in failed', e); }
      } else {
        if (authBtn) authBtn.textContent = 'Sign in';
        if (userEmail) userEmail.textContent = '';
        if (window.StorageManager && window.StorageManager.setUser) window.StorageManager.setUser(null);
      }

      if (authBtn) {
        authBtn.onclick = async () => {
          try {
            const current = window.FirebaseHelper.getCurrentUser && window.FirebaseHelper.getCurrentUser();
            if (current) {
              await window.FirebaseHelper.signOut();
            } else {
              await window.FirebaseHelper.signInWithGoogle();
            }
          } catch (err) { console.warn('Auth action failed', err); }
        };
      }
    });
  })();

  // Notification preference and in-page scheduling helper
  function isNotifyEnabled(){
    return localStorage.getItem('tasknest_notify') === 'true';
  }

  async function requestNotificationPermission(){
    if (!('Notification' in window)) return false;
    const p = await Notification.requestPermission();
    return p === 'granted';
  }

  // schedule an in-page notification for when the page is open
  // eventObj: { id, title, start } where start is ISO datetime string
  window.scheduleNotification = function(eventObj){
    try {
      if (!isNotifyEnabled()) return;
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      const when = new Date(eventObj.start).getTime();
      const now = Date.now();
      const ms = when - now;
      if (isNaN(when) || ms <= 0) return; // in past

      // limit max timeout to 24 days (setTimeout limit in browsers), else skip
      const MAX_TIMEOUT = 2147483647; // ~24.8 days
      if (ms > MAX_TIMEOUT) return;

      setTimeout(() => {
        try {
          new Notification(eventObj.title || 'TaskNest Event', {
            body: eventObj.title || 'You have an event',
            tag: eventObj.id
          });
        } catch (err) {
          console.warn('Notification show failed', err);
        }
      }, ms);
    } catch (err) {
      console.warn('scheduleNotification error', err);
    }
  };

  // wire notify toggle if present
  const notifyToggle = document.getElementById('notify-toggle');
  if (notifyToggle) {
    notifyToggle.checked = isNotifyEnabled();
    notifyToggle.addEventListener('change', async () => {
      const enabled = notifyToggle.checked;
      if (enabled) {
        const granted = await requestNotificationPermission();
        localStorage.setItem('tasknest_notify', granted ? 'true' : 'false');
        if (!granted && typeof M !== 'undefined' && M.toast) M.toast({ html: 'Notifications blocked by user.' });
      } else {
        localStorage.setItem('tasknest_notify', 'false');
      }
    });
  }
});
