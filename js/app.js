import '@francofantomius/material-components';
import * as db from './db.js';
import * as ui from './ui.js';
import { t, getLanguage, setLanguage, applyTranslations, initTranslations } from './i18n.js';

// Global In-Memory State
let cachedNotes = [];

const dom = {
  // Settings modal fields
  settingsEmail: null,
  settingsPassword: null,
  settingsTwofactor: null,
  btnSaveSync: null,
  syncSettingsStatus: null,
  syncCredentialsContainer: null,

  // Import/Export
  btnExportBackup: null,
  btnImportBackupBtn: null,
  importFileInput: null,
  importStatusText: null
};

// --- Bootstrapping ---

window.addEventListener('DOMContentLoaded', async () => {
  // Initialize translations before applying them
  try {
    await initTranslations();
  } catch (err) {
    console.error('Failed to load translations:', err);
  }
  // Translate static layout components initially
  applyTranslations();

  // 1. Register PWA Service Worker
  registerServiceWorker();

  // 2. Wire up UI actions
  ui.initUI({
    onSaveNote: handleSaveNote,
    onDeleteNote: handleDeleteNote,
    onOpenSettings: handleOpenSettings,
    onSignout: handleDisableSync
  });

  // 3. Register DB updates listener
  db.registerCallbacks(handleDBChange, handleSyncStatusChange);

  // 4. Load all notes and initialize workspace immediately
  await initializeWorkspace();

  // 5. Setup Action Event Listeners for Settings and backups
  setupSettingsListeners();

  // 6. Setup Network Online/Offline status listeners
  setupNetworkListeners();
});

/**
 * Handle network connectivity changes
 */
function setupNetworkListeners() {
  window.addEventListener('online', () => {
    console.log('[App] Connection online');
    db.handleNetworkStateChange(true);
  });

  window.addEventListener('offline', () => {
    console.log('[App] Connection offline');
    db.handleNetworkStateChange(false);
  });
}

/**
 * Register Service Worker for PWA / offline support
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    // Unregister active service worker during local dev mode to prevent caching/HMR/font issues
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
          console.log('[App] Unregistered active Service Worker for development');
        }
      });
      return;
    }

    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        console.log('[App] Service Worker registered successfully', reg);
      })
      .catch((err) => {
        console.error('[App] Service Worker registration failed', err);
      });
  }
}

/**
 * Load local notes and start background sync if enabled
 */
async function initializeWorkspace() {
  try {
    cachedNotes = await db.loadAllNotes();
    await purgeExpiredTrashedNotes();
    ui.updateNotesData(cachedNotes);

    const syncSettings = await db.getSyncSettings();
    ui.updateProfileUI(syncSettings);
    if (syncSettings && syncSettings.enabled) {
      db.startSync(syncSettings).catch(err => {
        console.warn("[Sync] Initial sync connection failed:", err);
      });
    }
  } catch (err) {
    console.error('[App] Initialization failed:', err);
  }
}

/**
 * Permanently delete notes in the trash for longer than 60 days.
 */
async function purgeExpiredTrashedNotes() {
  const sixtyDaysInMs = 60 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const expiredNotes = cachedNotes.filter(note => {
    if (!note.isTrashed) return false;
    const trashedTime = note.trashedAt || note.updatedAt || note.createdAt;
    return (now - trashedTime) > sixtyDaysInMs;
  });

  if (expiredNotes.length > 0) {
    console.log(`[Trash] Purging ${expiredNotes.length} expired trashed notes`);
    for (const note of expiredNotes) {
      try {
        await db.deleteNoteFromDB(note.id);
      } catch (err) {
        console.error(`[Trash] Failed to permanently delete expired note ${note.id}:`, err);
      }
    }
    const expiredIds = expiredNotes.map(n => n.id);
    cachedNotes = cachedNotes.filter(n => !expiredIds.includes(n.id));
  }
}

// --- Sync & Data callback handlers ---

async function handleDBChange(change) {
  const noteId = change.id;

  if (change.deleted) {
    // Note deleted remotely
    cachedNotes = cachedNotes.filter(n => n.id !== noteId);
  } else {
    // Note added or updated
    try {
      const doc = await db.getNote(noteId);
      const existingIdx = cachedNotes.findIndex(n => n.id === noteId);

      if (existingIdx !== -1) {
        // Resolve conflict: check timestamps
        const existingNote = cachedNotes[existingIdx];
        if (doc.updatedAt > existingNote.updatedAt) {
          cachedNotes[existingIdx] = { id: noteId, ...doc };
        }
      } else {
        cachedNotes.push({ id: noteId, ...doc });
      }
    } catch (err) {
      console.error("Failed to process changed note:", noteId, err);
    }
  }

  ui.updateNotesData(cachedNotes);
}

async function handleSyncStatusChange(status) {
  ui.updateSyncStatusUI(status);
  try {
    const syncSettings = await db.getSyncSettings();
    ui.updateProfileUI(syncSettings);
  } catch (err) {
    console.error("Failed to load settings on status change:", err);
  }
}

// --- UI callback handlers ---

async function handleSaveNote(id, noteObj) {
  // Save to database
  await db.saveNote(id, noteObj);

  // Update memory cache
  const idx = cachedNotes.findIndex(n => n.id === id);
  const updatedNote = { id, ...noteObj };
  if (idx !== -1) {
    cachedNotes[idx] = updatedNote;
  } else {
    cachedNotes.push(updatedNote);
  }

  ui.updateNotesData(cachedNotes);
}

async function handleDeleteNote(id) {
  // Delete from DB
  await db.deleteNoteFromDB(id);

  // Remove from memory
  cachedNotes = cachedNotes.filter(n => n.id !== id);
  ui.updateNotesData(cachedNotes);
}

// --- Settings & Sync Actions ---

async function handleOpenSettings() {
  ui.showSettings();
}

// Setup Settings listeners
function setupSettingsListeners() {
  dom.settingsEmail = document.getElementById('sync-email');
  dom.settingsPassword = document.getElementById('sync-password');
  dom.settingsTwofactor = document.getElementById('sync-twofactor');
  dom.btnSaveSync = document.getElementById('btn-save-sync');
  dom.syncSettingsStatus = document.getElementById('sync-settings-status');
  dom.syncCredentialsContainer = document.getElementById('sync-credentials-container');
  dom.btnExportBackup = document.getElementById('btn-export-backup');
  dom.btnImportBackupBtn = document.getElementById('btn-import-backup-btn');
  dom.importFileInput = document.getElementById('import-file-input');
  dom.importStatusText = document.getElementById('import-status-text');

  if (dom.btnSaveSync) {
    dom.btnSaveSync.addEventListener('click', handleSaveSyncSettings);
  }

  // Backup triggers
  if (dom.btnExportBackup) {
    dom.btnExportBackup.addEventListener('click', handleExportBackup);
  }
  if (dom.btnImportBackupBtn && dom.importFileInput) {
    dom.btnImportBackupBtn.addEventListener('click', () => {
      dom.importFileInput.click();
    });
  }
  if (dom.importFileInput) {
    dom.importFileInput.addEventListener('change', handleImportBackupFile);
  }

  // Language selection modal setup
  const btnOpenLanguageDialog = document.getElementById('btn-open-language-dialog');
  const languageModal = document.getElementById('language-modal');
  const languageRadioGroup = document.getElementById('language-radio-group');
  const btnLanguageCancel = document.getElementById('btn-language-cancel');
  const btnLanguageSelect = document.getElementById('btn-language-select');

  function syncLanguageRadios(currentLang) {
    if (!languageRadioGroup) return;
    languageRadioGroup.value = currentLang;
    const radios = languageRadioGroup.querySelectorAll('md-radio');
    radios.forEach(radio => {
      radio.checked = (radio.value === currentLang);
    });
  }

  if (btnOpenLanguageDialog && languageModal) {
    btnOpenLanguageDialog.addEventListener('click', () => {
      const currentLang = getLanguage();
      syncLanguageRadios(currentLang);
      languageModal.showModal();
    });
  }

  if (btnLanguageCancel && languageModal) {
    btnLanguageCancel.addEventListener('click', () => {
      languageModal.close();
    });
  }

  if (btnLanguageSelect && languageModal && languageRadioGroup) {
    btnLanguageSelect.addEventListener('click', async () => {
      const checkedRadio = languageRadioGroup.querySelector('md-radio[checked]') ||
        Array.from(languageRadioGroup.querySelectorAll('md-radio')).find(r => r.checked);
      const newLang = checkedRadio?.value || languageRadioGroup.value;

      if (newLang) {
        try {
          await setLanguage(newLang);
        } catch (err) {
          console.error('Failed to change language:', err);
        }
        applyTranslations();
        ui.retranslateDynamicUI();
      }
      languageModal.close();
    });
  }
}

async function handleSaveSyncSettings() {
  const email = dom.settingsEmail.value.trim();
  const password = dom.settingsPassword.value.trim();
  const twoFactorCode = dom.settingsTwofactor.value.trim();

  if (!email || !password) {
    showSyncStatus(t('status_credentials_required'), "error");
    return;
  }

  const tempSettings = {
    email: email,
    password: password,
    twoFactorCode: twoFactorCode,
    enabled: true
  };

  try {
    showSyncStatus(t('status_connecting'), "info");

    await db.startSync(tempSettings);

    showSyncStatus(t('status_sync_enabled'), "success");

    setTimeout(ui.hideLoginModal, 1000);
  } catch (err) {
    console.error("Failed to enable sync:", err);
    showSyncStatus(t('status_sync_failed'), "error");
  }
}

async function handleDisableSync() {
  try {
    await db.clearAllNotes();
  } catch (err) {
    console.error("Failed to clear local notes cache on signout:", err);
  }
  cachedNotes = [];
  ui.updateNotesData(cachedNotes);

  const settings = await db.getSyncSettings();
  settings.enabled = false;

  // Clear the session keys
  delete settings.username;
  delete settings.avatarURL;
  delete settings.apiKey;
  delete settings.masterKeys;
  delete settings.publicKey;
  delete settings.privateKey;
  delete settings.baseFolderUUID;
  delete settings.userId;
  delete settings.authVersion;

  // Clear legacy credentials if present
  delete settings.email;
  delete settings.password;
  delete settings.twoFactorCode;

  await db.saveSyncSettings(settings);
  db.stopSync();

  ui.updateProfileUI(settings);
  showSyncStatus(t('status_sync_disabled'), "success");
}

function showSyncStatus(text, type) {
  dom.syncSettingsStatus.textContent = text;
  dom.syncSettingsStatus.className = `status-message ${type}`;
}

// --- Import / Export Local Backups ---

/**
 * Downloads a text file
 */
function downloadFile(filename, text) {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

/**
 * Exports notes in JSON format.
 */
function handleExportBackup() {
  try {
    const backupObj = {
      version: 1,
      type: 'decrypted_notes', // Keep same type for backward compatibility with older exports
      timestamp: Date.now(),
      notes: cachedNotes.map(n => ({
        title: n.title,
        body: n.body,
        tags: n.tags,
        color: n.color,
        isPinned: n.isPinned,
        isArchived: n.isArchived,
        isTrashed: n.isTrashed,
        trashedAt: n.trashedAt || null,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt
      }))
    };

    downloadFile(`noten-backup-${Date.now()}.json`, JSON.stringify(backupObj, null, 2));
  } catch (err) {
    console.error("Export failed:", err);
    alert(t('status_export_failed'));
  }
}

/**
 * Parses uploaded backup JSON file
 */
function handleImportBackupFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const data = JSON.parse(event.target.result);

      // Support both old decrypted notes exports and new backup exports
      if (data.type === 'decrypted_notes' || data.notes) {
        if (confirm(t('confirm_import_notes', { count: data.notes.length }))) {
          dom.importStatusText.textContent = t('status_importing');
          dom.importStatusText.className = "status-message info";

          for (const note of data.notes) {
            const noteId = 'note_' + crypto.randomUUID();
            note.updatedAt = Date.now();
            note.trashedAt = note.trashedAt !== undefined ? note.trashedAt : (note.isTrashed ? Date.now() : null);
            await db.saveNote(noteId, note);
            cachedNotes.push({ id: noteId, ...note });
          }

          dom.importStatusText.textContent = t('status_import_success', { count: data.notes.length });
          dom.importStatusText.className = "status-message success";
          ui.updateNotesData(cachedNotes);
        }
      } else {
        alert(t('status_import_invalid'));
      }
    } catch (err) {
      console.error(err);
      alert(t('status_import_failed'));
    } finally {
      dom.importFileInput.value = ''; // Reset input element
    }
  };
  reader.readAsText(file);
}
