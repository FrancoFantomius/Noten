/**
 * Noten UI - Theme Controller
 */

import { elements } from './state.js';

/**
 * Applies the given theme to the document body and root
 * @param {boolean} dark - Whether to apply the dark theme
 */
function applyTheme(dark) {
  if (dark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
  }

  // Update theme-color meta tags dynamically from --md-sys-color-surface
  const themeColor = getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-surface').trim() || (dark ? '#161b22' : '#ffffff');
  const metaThemeColors = document.querySelectorAll('meta[name="theme-color"]');
  metaThemeColors.forEach(meta => {
    meta.setAttribute('content', themeColor);
  });
}

/**
 * Initializes theme configuration and sets up the change listeners
 */
export function initTheme() {
  const themeSelect = elements.themeSelect;
  if (!themeSelect) return;

  const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  let currentMode = 'system';

  /**
   * Syncs the theme with the device preference
   */
  function syncWithDevice() {
    applyTheme(mediaQuery ? mediaQuery.matches : false);
  }

  /**
   * Updates the selected state of the segmented buttons
   */
  function syncSelectedButton(mode) {
    const buttons = themeSelect.querySelectorAll('md-segmented-button');
    buttons.forEach(btn => {
      btn.selected = (btn.value === mode);
    });
  }

  /**
   * Applies the theme for the given mode
   * @param {string} mode - 'light', 'dark' or 'system'
   */
  function applyMode(mode) {
    currentMode = mode;
    syncSelectedButton(mode);
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
    if (currentMode === 'system') syncWithDevice();
  }

  if (mediaQuery) {
    if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', onDeviceThemeChange);
    else mediaQuery.addListener(onDeviceThemeChange);
  }

  // Theme Segmented Button Change Listener
  themeSelect.addEventListener('change', (e) => {
    const mode = e.detail?.value || e.target.value;
    if (mode) {
      localStorage.setItem('theme', mode);
      applyMode(mode);
    }
  });

  // Apply saved settings (default to device preference if not set)
  const useSystemTheme = localStorage.getItem('theme-system') === 'true';
  const savedTheme = useSystemTheme ? 'system' : (localStorage.getItem('theme') || 'system');

  applyMode(savedTheme);
}