/**
 * Noten UI - Theme Controller
 */

import { elements } from './state.js';

/**
 * Applies the given theme to the document body
 * @param {boolean} dark - Whether to apply the dark theme
 */
function applyTheme(dark) {
  if (dark) {
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
  } else {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
  }
}

/**
 * Initializes theme configuration and sets up the change listeners
 */
export function initTheme() {
  const themeSelect = elements.themeSelect;
  if (!themeSelect) return;

  const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  /**
   * Syncs the theme with the device preference
   */
  function syncWithDevice() {
    applyTheme(mediaQuery ? mediaQuery.matches : false);
  }

  /**
   * Applies the theme for the given mode
   * @param {string} mode - 'light', 'dark' or 'system'
   */
  function applyMode(mode) {
    if (mode === 'system') {
      syncWithDevice();
    } else {
      applyTheme(mode === 'dark');
    }
  }

  /**
   * Listens for device theme changes while in sync mode
   */
  function onDeviceThemeChange() {
    if (themeSelect.value === 'system') syncWithDevice();
  }

  if (mediaQuery) {
    if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', onDeviceThemeChange);
    else mediaQuery.addListener(onDeviceThemeChange);
  }

  // Theme Select Change Listener
  themeSelect.addEventListener('change', (e) => {
    localStorage.setItem('theme', e.target.value);
    applyMode(e.target.value);
  });

  // Apply saved settings (default to device preference if not set)
  const useSystemTheme = localStorage.getItem('theme-system') === 'true';
  const savedTheme = useSystemTheme ? 'system' : (localStorage.getItem('theme') || 'system');

  themeSelect.value = savedTheme;
  applyMode(savedTheme);
}