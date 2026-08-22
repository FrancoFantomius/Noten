import '@francofantomius/material-components';

/**
 * Initialize theme for static pages (Privacy Policy, Terms of Service)
 */
(function initStaticTheme() {
  const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const useSystemTheme = localStorage.getItem('theme-system') === 'true';
  const savedTheme = useSystemTheme ? 'system' : (localStorage.getItem('theme') || 'system');

  function applyTheme(isDark) {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
    }

    const themeColor = isDark ? '#161b22' : '#ffffff';
    const metaThemeColors = document.querySelectorAll('meta[name="theme-color"]');
    metaThemeColors.forEach(meta => {
      meta.setAttribute('content', themeColor);
    });
  }

  if (savedTheme === 'system') {
    applyTheme(mediaQuery ? mediaQuery.matches : true);
    if (mediaQuery) {
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', (e) => applyTheme(e.matches));
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener((e) => applyTheme(e.matches));
      }
    }
  } else {
    applyTheme(savedTheme === 'dark');
  }
})();

