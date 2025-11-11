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
