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
});
