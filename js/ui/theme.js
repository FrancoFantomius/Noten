/**
 * Noten UI - Theme Controller
 */

import { elements } from './state.js';

/**
 * Initializes theme configuration and sets up the change listener
 */
export function initTheme() {
  if (!elements.themeToggle) return;

  // Theme Toggle Change Listener
  elements.themeToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    }
  });

  // Apply saved theme (default to device preference if not set)
  const systemPrefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const defaultTheme = systemPrefersLight ? 'light' : 'dark';
  const savedTheme = localStorage.getItem('theme') || defaultTheme;

  if (savedTheme === 'light') {
    elements.themeToggle.checked = false;
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
  } else {
    elements.themeToggle.checked = true;
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
  }
}
