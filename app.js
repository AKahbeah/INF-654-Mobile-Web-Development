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

  // Service worker registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => console.log('Service Worker Registered', reg))
      .catch(err => console.error('Service Worker Failed', err));
  }
});
