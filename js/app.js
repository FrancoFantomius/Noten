/**
 * Noten - Main Application Controller
 */

import * as db from './db.js';
import * as ui from './ui.js';
import { t, getLanguage, setLanguage, applyTranslations } from './i18n.js';

// Global In-Memory State
let cachedNotes = [];

// DOM references (Simplified to remove lockscreen and master password references)
const dom = {
  // Settings modal fields
  settingsEmail: document.getElementById('sync-email'),
  settingsPassword: document.getElementById('sync-password'),
  settingsTwofactor: document.getElementById('sync-twofactor'),
  btnSaveSync: document.getElementById('btn-save-sync'),
  btnDisableSync: document.getElementById('btn-disable-sync'),
  syncSettingsStatus: document.getElementById('sync-settings-status'),
  
  // Import/Export
  btnExportBackup: document.getElementById('btn-export-backup'),
  importFileInput: document.getElementById('import-file-input'),
  importStatusText: document.getElementById('import-status-text')
};

// --- Bootstrapping ---

window.addEventListener('DOMContentLoaded', async () => {
  // Translate static layout components initially
  applyTranslations();

  // 1. Register PWA Service Worker
  registerServiceWorker();

  // 2. Wire up UI actions
  ui.initUI({
    onSaveNote: handleSaveNote,
    onDeleteNote: handleDeleteNote,
    onOpenSettings: handleOpenSettings
  });

  // 3. Register DB updates listener
  db.registerCallbacks(handleDBChange, handleSyncStatusChange);

  // 4. Load all notes and initialize workspace immediately
  await initializeWorkspace();

  // 5. Setup Action Event Listeners for Settings and backups
  setupSettingsListeners();
});

/**
 * Register Service Worker for PWA / offline support
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
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
    ui.updateNotesData(cachedNotes);

    const syncSettings = await db.getSyncSettings();
    if (syncSettings && syncSettings.enabled) {
      db.startSync(syncSettings);
    }
  } catch (err) {
    console.error('[App] Initialization failed:', err);
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

function handleSyncStatusChange(status) {
  ui.updateSyncStatusUI(status);
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
  const syncSettings = await db.getSyncSettings();
  
  dom.settingsEmail.value = syncSettings.email || '';
  dom.settingsPassword.value = syncSettings.password || '';
  dom.settingsTwofactor.value = syncSettings.twoFactorCode || '';

  if (syncSettings.enabled && syncSettings.email && syncSettings.password) {
    dom.btnDisableSync.classList.remove('hidden');
  } else {
    dom.btnDisableSync.classList.add('hidden');
  }

  ui.showSettings();
}

// Setup Settings listeners
function setupSettingsListeners() {
  dom.btnSaveSync.addEventListener('click', handleSaveSyncSettings);
  dom.btnDisableSync.addEventListener('click', handleDisableSync);
  
  // Backup triggers
  dom.btnExportBackup.addEventListener('click', handleExportBackup);
  dom.importFileInput.addEventListener('change', handleImportBackupFile);

  // Language selector change listener
  const languageSelect = document.getElementById('language-select');
  if (languageSelect) {
    languageSelect.value = getLanguage();
    languageSelect.addEventListener('change', (e) => {
      const newLang = e.target.value;
      setLanguage(newLang);
      applyTranslations();
      ui.retranslateDynamicUI();
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

  const syncSettings = {
    email: email,
    password: password,
    twoFactorCode: twoFactorCode,
    enabled: true
  };

  try {
    showSyncStatus(t('status_connecting'), "info");
    
    // Save settings and start sync
    await db.saveSyncSettings(syncSettings);
    db.startSync(syncSettings);
    
    dom.btnDisableSync.classList.remove('hidden');
    showSyncStatus(t('status_sync_enabled'), "success");
    
    setTimeout(ui.hideSettings, 1000);
  } catch (err) {
    console.error("Failed to enable sync:", err);
    showSyncStatus(t('status_sync_failed'), "error");
  }
}

async function handleDisableSync() {
  const settings = await db.getSyncSettings();
  settings.enabled = false;
  
  await db.saveSyncSettings(settings);
  db.stopSync();
  
  dom.btnDisableSync.classList.add('hidden');
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
