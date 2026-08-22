/**
 * Noten - Internationalization & Translation Module
 */

import enTranslations from './languages/en.json';

const loadedTranslations = {
  en: enTranslations
};
const SUPPORTED_LANGUAGES = ["ar","de","el","en","es","fr","hi","it","nl","pl","pt","ru","sv","tr","uk","zh"];

async function loadLanguageFile(lang) {
  if (lang === 'en' || loadedTranslations[lang]) return;
  try {
    const module = await import(`./languages/${lang}.json`);
    loadedTranslations[lang] = module.default;
  } catch (error) {
    console.error(`Error loading language chunk ${lang}:`, error);
    loadedTranslations[lang] = {};
  }
}

function pruneUnusedTranslations(activeLang) {
  Object.keys(loadedTranslations).forEach(lang => {
    if (lang !== 'en' && lang !== activeLang) {
      delete loadedTranslations[lang];
    }
  });
}

/**
 * Initializes translations at application startup.
 * Loads the active language and English (for fallback) in parallel.
 */
export async function initTranslations() {
  const activeLang = getLanguage();
  pruneUnusedTranslations(activeLang);
  const langsToLoad = ['en'];
  if (activeLang !== 'en') {
    langsToLoad.push(activeLang);
  }
  await Promise.all(langsToLoad.map(lang => loadLanguageFile(lang)));
}

/**
 * Returns the currently active language code.
 * Falls back to browser language, or English if not supported.
 */
export function getLanguage() {
  const saved = localStorage.getItem('language');
  if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
    return saved;
  }

  // Detect browser language
  const browserLang = (navigator.language || 'en').substring(0, 2).toLowerCase();
  if (SUPPORTED_LANGUAGES.includes(browserLang)) {
    return browserLang;
  }

  return 'en';
}

/**
 * Saves a new active language code.
 */
export async function setLanguage(lang) {
  if (SUPPORTED_LANGUAGES.includes(lang)) {
    await loadLanguageFile(lang);
    pruneUnusedTranslations(lang);
    localStorage.setItem('language', lang);
  }
}

/**
 * Returns a translated string for a given key, interpolating parameters.
 */
export function t(key, params = {}) {
  const lang = getLanguage();
  const langStrings = loadedTranslations[lang] || loadedTranslations['en'] || {};
  let val = langStrings[key] || (loadedTranslations['en'] && loadedTranslations['en'][key]) || key;

  // Interpolation logic
  Object.keys(params).forEach(pKey => {
    val = val.replace(new RegExp(`\\{${pKey}\\}`, 'g'), params[pKey]);
  });

  return val;
}

export const LANGUAGE_NAMES = {
  ar: 'العربية (Arabic)',
  de: 'Deutsch',
  el: 'Ελληνικά',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  hi: 'हिन्दी (Hindi)',
  it: 'Italiano',
  nl: 'Nederlands',
  pl: 'Polski',
  pt: 'Português',
  ru: 'Русский',
  sv: 'Svenska',
  tr: 'Türkçe',
  uk: 'Українська',
  zh: '中文 (Chinese)'
};

export function getLanguageName(code) {
  return LANGUAGE_NAMES[code] || code;
}

/**
 * Iterates through DOM elements with translation properties and updates them.
 */
export function applyTranslations(root = document) {
  // Translate main texts
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = t(key);
    if (text) {
      // Find first non-whitespace text node to replace, or append new if none exists
      let textNode = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '');
      if (!textNode) {
        textNode = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
      }

      if (textNode) {
        textNode.textContent = text;
      } else {
        el.appendChild(document.createTextNode(text));
      }
    }
  });

  // Translate HTML contents
  root.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    const text = t(key, {
      sdk: '<a href="https://github.com/FilenCloudDienste/filen-sdk-ts" target="_blank">SDK</a>',
      repo: '<a href="https://github.com/francofantomius/noten" target="_blank">Noten</a>'
    });
    if (text) {
      el.innerHTML = text;
    }
  });

  // Translate placeholders
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const text = t(key);
    if (text) {
      el.placeholder = text;
    }
  });

  // Translate titles
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const text = t(key);
    if (text) {
      el.title = text;
    }
  });

  // Translate ARIA labels
  root.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria');
    const text = t(key);
    if (text) {
      el.setAttribute('aria-label', text);
    }
  });

  // Translate element headlines (e.g. md-dialog)
  root.querySelectorAll('[data-i18n-headline]').forEach(el => {
    const key = el.getAttribute('data-i18n-headline');
    const text = t(key);
    if (text) {
      el.setAttribute('headline', text);
    }
  });

  // Translate element labels (e.g. md-fab)
  root.querySelectorAll('[data-i18n-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-label');
    const text = t(key);
    if (text) {
      el.setAttribute('label', text);
      if (el.label !== undefined) {
        el.label = text;
      }
    }
  });

  // Update current language name label
  const activeLang = getLanguage();
  const currentLangLabel = root.querySelector('#current-language-name');
  if (currentLangLabel) {
    currentLangLabel.textContent = getLanguageName(activeLang);
  }

  // Dynamically translate SEO description in head meta tags
  const description = t('app_description');
  if (description) {
    const descMeta = root.querySelector('meta[name="description"]');
    if (descMeta) descMeta.setAttribute('content', description);

    const ogDescMeta = root.querySelector('meta[property="og:description"]');
    if (ogDescMeta) ogDescMeta.setAttribute('content', description);

    const twitterDescMeta = root.querySelector('meta[property="twitter:description"]');
    if (twitterDescMeta) twitterDescMeta.setAttribute('content', description);
  }

  // Dynamically sync Web App Manifest with current language translations
  updateDynamicManifest(root);
}

let dynamicManifestUrl = null;

/**
 * Dynamically synchronizes the Web App Manifest (including shortcuts, title, and description)
 * with the active translation language.
 */
export function updateDynamicManifest(root = document) {
  const manifestLink = root.querySelector('link[rel="manifest"]');
  if (!manifestLink) return;

  const manifestData = {
    name: t('app_title') || 'Noten',
    short_name: t('app_title') || 'Noten',
    description: t('app_description') || 'Your notes private and secure accross devices',
    start_url: './index.html',
    display: 'fullscreen',
    background_color: '#0e1117',
    theme_color: '#161b22',
    categories: ['productivity', 'utilities'],
    icons: [
      { src: './img/icons/noten_x48.png', sizes: '48x48', type: 'image/png' },
      { src: './img/icons/noten_x72.png', sizes: '72x72', type: 'image/png' },
      { src: './img/icons/noten_x96.png', sizes: '96x96', type: 'image/png' },
      { src: './img/icons/noten_x128.png', sizes: '128x128', type: 'image/png' },
      { src: './img/icons/noten_x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: './img/icons/noten_x384.png', sizes: '384x384', type: 'image/png' },
      { src: './img/icons/noten_x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
    ],
    shortcuts: [
      {
        name: t('btn_new_note') || 'New Note',
        short_name: t('btn_new_note') || 'New',
        description: t('btn_new_note') || 'Create a new note',
        url: './index.html#new',
        icons: [
          { src: './img/icons/noten_x96.png', sizes: '96x96', type: 'image/png' },
          { src: './img/icons/noten_x192.png', sizes: '192x192', type: 'image/png' }
        ]
      },
      {
        name: t('nav_archive') || 'Archive',
        short_name: t('nav_archive') || 'Archive',
        description: t('nav_archive') || 'View archived notes',
        url: './archive.html',
        icons: [
          { src: './img/ArchiveIcon.png', sizes: '30x30', type: 'image/png' }
        ]
      },
      {
        name: t('nav_trash') || 'Trash',
        short_name: t('nav_trash') || 'Trash',
        description: t('nav_trash') || 'View trashed notes',
        url: './trash.html',
        icons: [
          { src: './img/TrashIcon.png', sizes: '30x30', type: 'image/png' }
        ]
      },
      {
        name: t('settings_header') || t('btn_settings_open_title') || 'Settings',
        short_name: t('settings_header') || t('btn_settings_open_title') || 'Settings',
        description: t('settings_header') || t('btn_settings_open_title') || 'Open application settings',
        url: './index.html#settings',
        icons: [
          { src: './img/SettingsIcon.png', sizes: '30x30', type: 'image/png' }
        ]
      }
    ]
  };

  try {
    if (dynamicManifestUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
      URL.revokeObjectURL(dynamicManifestUrl);
    }
    const blob = new Blob([JSON.stringify(manifestData, null, 2)], { type: 'application/manifest+json' });
    dynamicManifestUrl = URL.createObjectURL(blob);
    manifestLink.setAttribute('href', dynamicManifestUrl);
  } catch (e) {
    console.error('Failed to update dynamic manifest:', e);
  }
}
