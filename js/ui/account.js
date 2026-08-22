/**
 * Noten UI - Account and Settings Controls
 */

import { t } from '../i18n.js';
import { state, elements } from './state.js';

/**
 * Initializes account menu, profile actions, settings, and login modal event listeners
 */
export function initAccountUI() {
  // Settings Dialog Triggers
  if (elements.btnSettingsOpen) {
    elements.btnSettingsOpen.addEventListener('click', () => {
      if (state.onOpenSettingsCallback) state.onOpenSettingsCallback();
    });
  }

  if (elements.btnSettingsClose) {
    elements.btnSettingsClose.addEventListener('click', hideSettings);
  }

  if (elements.btnSettingsCloseIcon) {
    elements.btnSettingsCloseIcon.addEventListener('click', hideSettings);
  }

  const btnSettingsBack = document.getElementById('btn-settings-back');
  if (btnSettingsBack) {
    btnSettingsBack.addEventListener('click', hideSettings);
  }

  if (elements.btnSettingsSave) {
    elements.btnSettingsSave.addEventListener('click', hideSettings);
  }

  if (elements.settingsModal) {
    elements.settingsModal.addEventListener('click', (e) => {
      if (e.target === elements.settingsModal) {
        hideSettings();
      }
    });
    elements.settingsModal.addEventListener('close', () => {
      cleanupSettingsHash();
    });
  }

  // Dismiss settings modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.settingsModal && elements.settingsModal.classList.contains('active')) {
      hideSettings();
    }
  });

  // Open Settings initially if hash is #settings
  if (window.location.hash === '#settings') {
    showSettings();
  }

  // Account Menu & Profile Actions
  if (elements.btnDropdownSettings) {
    elements.btnDropdownSettings.addEventListener('click', () => {
      if (elements.accountMenu) elements.accountMenu.open = false;
      if (state.onOpenSettingsCallback) state.onOpenSettingsCallback();
    });
  }

  if (elements.btnSyncLogin) {
    elements.btnSyncLogin.addEventListener('click', () => {
      showLoginModal();
    });
  }

  if (elements.syncStatus) {
    elements.syncStatus.addEventListener('click', (e) => {
      e.stopPropagation();
      if (elements.accountMenu && elements.accountMenu.style.display !== 'none') {
        elements.accountMenu.open = !elements.accountMenu.open;
      } else {
        showLoginModal();
      }
    });
  }

  // Bind close/cancel listeners for the dedicated login modal
  if (elements.btnLoginClose) {
    elements.btnLoginClose.addEventListener('click', hideLoginModal);
  }
  const btnLoginBack = document.getElementById('btn-login-back');
  if (btnLoginBack) {
    btnLoginBack.addEventListener('click', hideLoginModal);
  }
  if (elements.btnLoginCancel) {
    elements.btnLoginCancel.addEventListener('click', hideLoginModal);
  }
  if (elements.loginModal) {
    elements.loginModal.addEventListener('click', (e) => {
      if (e.target === elements.loginModal) {
        hideLoginModal();
      }
    });
    elements.loginModal.addEventListener('close', () => {
      const syncStatusMsg = document.getElementById('sync-settings-status');
      if (syncStatusMsg) syncStatusMsg.textContent = '';
    });
  }

  // Dismiss login modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.loginModal && elements.loginModal.classList.contains('active')) {
      hideLoginModal();
    }
  });

  if (elements.accountMenu) {
    elements.accountMenu.addEventListener('manage-click', (e) => {
      const url = e.detail?.manageUrl || 'https://app.filen.io/#/settings/account';
      window.open(url, '_blank', 'noopener,noreferrer');
    });

    elements.accountMenu.addEventListener('edit-avatar', () => {
      window.open('https://app.filen.io/#/settings/account', '_blank', 'noopener,noreferrer');
    });
  }

  if (elements.btnDropdownSignout) {
    elements.btnDropdownSignout.addEventListener('click', () => {
      if (elements.accountMenu) elements.accountMenu.open = false;
      if (state.onSignoutCallback) state.onSignoutCallback();
    });
  }
}

function cleanupSettingsHash() {
  const statusMsg = document.getElementById('sync-settings-status');
  if (statusMsg) statusMsg.textContent = '';

  if (window.location.hash === '#settings') {
    if (state.isSettingsModalHashPushed) {
      state.isSettingsModalHashPushed = false;
      history.back();
    } else {
      history.replaceState("", document.title, window.location.pathname + window.location.search);
    }
  } else {
    state.isSettingsModalHashPushed = false;
  }
}

/**
 * Settings Modal trigger
 */
export function showSettings() {
  if (elements.settingsModal) {
    if (typeof elements.settingsModal.showModal === 'function') {
      elements.settingsModal.showModal();
    }
    elements.settingsModal.classList.add('active');
    if (window.location.hash !== '#settings') {
      state.isSettingsModalHashPushed = true;
      window.location.hash = 'settings';
    }
  }
}

export function hideSettings() {
  if (elements.settingsModal) {
    if (typeof elements.settingsModal.close === 'function') {
      elements.settingsModal.close();
    }
    elements.settingsModal.classList.remove('active');
  }
  cleanupSettingsHash();
}

/**
 * Update sync status indicator UI
 */
export function updateSyncStatusUI(status) {
  state.currentSyncStatus = status;
  const badge = elements.syncStatus;
  if (!badge) return;

  badge.className = `sync-badge ${status}`;

  let icon = 'cloud_off';
  let text = t('sync_offline');

  if (status === 'syncing') {
    icon = 'cloud_sync';
    text = t('sync_syncing');
  } else if (status === 'online') {
    icon = 'cloud_done';
    text = '';
  } else if (status === 'error') {
    icon = 'cloud_off';
    text = t('sync_error');
  }

  badge.innerHTML = `
    <span class="material-symbols-outlined">${icon}</span>
    ${text ? `<span class="sync-text">${text}</span>` : ''}
  `;
  badge.title = text ? t('sync_status_title', { status: text }) : 'Filen Sync';
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Update the account storage widget and md-account-menu storage properties
 */
export function updateAccountStorageUI(syncSettings) {
  const metaEl = document.getElementById('account-storage-meta');
  const barNotes = document.getElementById('account-storage-bar-notes');
  const barOther = document.getElementById('account-storage-bar-other');
  const notesText = document.getElementById('account-storage-notes-text');
  const otherText = document.getElementById('account-storage-other-text');
  const freeText = document.getElementById('account-storage-free-text');

  // Calculate local notes storage size in bytes
  let notesBytes = 0;
  if (state.decryptedNotes && Array.isArray(state.decryptedNotes)) {
    for (const note of state.decryptedNotes) {
      if (note.isTrashed) continue;
      try {
        notesBytes += new Blob([JSON.stringify(note)]).size;
      } catch {
        notesBytes += (note.title || '').length * 2 + (note.body || '').length * 2;
        if (note.images && Array.isArray(note.images)) {
          note.images.forEach(img => {
            const str = typeof img === 'string' ? img : (img?.url || img?.data || img?.src || '');
            notesBytes += str.length;
          });
        }
      }
    }
  }

  // Account total storage capacity (default 10 GB for standard Filen tier if unstated)
  const totalStorageBytes = (syncSettings && syncSettings.storageTotal) ? syncSettings.storageTotal : 10 * 1024 * 1024 * 1024;
  // Total used bytes across the Filen account
  const totalUsedBytes = Math.max(notesBytes, (syncSettings && syncSettings.storageUsed) ? syncSettings.storageUsed : 0);
  const otherFilesBytes = Math.max(0, totalUsedBytes - notesBytes);
  const freeBytes = Math.max(0, totalStorageBytes - totalUsedBytes);

  const notesPercent = totalStorageBytes > 0 ? Math.min(100, (notesBytes / totalStorageBytes) * 100) : 0;
  const otherPercent = totalStorageBytes > 0 ? Math.min(100 - notesPercent, (otherFilesBytes / totalStorageBytes) * 100) : 0;

  if (metaEl) {
    metaEl.textContent = `${formatBytes(totalUsedBytes)} of ${formatBytes(totalStorageBytes)} used`;
  }
  if (barNotes) {
    barNotes.style.width = `${notesPercent}%`;
  }
  if (barOther) {
    barOther.style.width = `${otherPercent}%`;
  }
  if (notesText) {
    notesText.textContent = `Notes: ${formatBytes(notesBytes)}`;
  }
  if (otherText) {
    otherText.textContent = `Other files: ${formatBytes(otherFilesBytes)}`;
  }
  if (freeText) {
    freeText.textContent = `Free: ${formatBytes(freeBytes)}`;
  }

  if (elements.accountMenu) {
    elements.accountMenu.storageUsed = formatBytes(totalUsedBytes);
    elements.accountMenu.storageTotal = formatBytes(totalStorageBytes);
    elements.accountMenu.storageProgress = totalStorageBytes > 0 ? (totalUsedBytes / totalStorageBytes) : 0;
  }
}

/**
 * Update the profile UI elements based on sync settings state
 */
export function updateProfileUI(syncSettings) {
  if (!elements.btnSyncLogin) return;

  const isSyncActive = syncSettings && syncSettings.enabled && (syncSettings.apiKey || syncSettings.email);

  if (isSyncActive) {
    if (elements.syncStatus) {
      elements.syncStatus.style.display = 'inline-flex';
    }
    if (elements.btnSettingsOpen) {
      elements.btnSettingsOpen.style.display = 'none';
    }
    if (elements.appDrawer) {
      elements.appDrawer.style.display = 'inline-block';
    }
    elements.btnSyncLogin.style.display = 'none';

    const email = syncSettings.email || '';
    const username = syncSettings.username || email.split('@')[0] || 'Connected';
    const letter = (username || email || '?').charAt(0).toUpperCase();

    if (elements.accountMenu) {
      elements.accountMenu.style.display = 'inline-block';
      elements.accountMenu.name = username;
      elements.accountMenu.email = email;
      elements.accountMenu.initials = letter;
      elements.accountMenu.avatar = syncSettings.avatarURL || '';
      elements.accountMenu.manageUrl = 'https://app.filen.io/#/settings/account';
      elements.accountMenu.manageText = t('manage_account') || 'Manage your Filen Account';
      elements.accountMenu.showTabs = false;
      elements.accountMenu.removeAttribute('show-tabs');

      updateAccountStorageUI(syncSettings);
    }
  } else {
    if (elements.syncStatus) {
      elements.syncStatus.style.display = 'none';
    }
    if (elements.btnSettingsOpen) {
      elements.btnSettingsOpen.style.display = 'inline-flex';
    }
    if (elements.appDrawer) {
      elements.appDrawer.style.display = 'none';
      elements.appDrawer.open = false;
    }
    elements.btnSyncLogin.style.display = 'inline-flex';
    if (elements.accountMenu) {
      elements.accountMenu.style.display = 'none';
      elements.accountMenu.open = false;
    }
  }
}

/**
 * Open the dedicated login/sync modal
 */
export function showLoginModal() {
  if (elements.loginModal) {
    if (typeof elements.loginModal.showModal === 'function') {
      elements.loginModal.showModal();
    }
    elements.loginModal.classList.add('active');
  }
}

/**
 * Close the dedicated login/sync modal and reset status
 */
export function hideLoginModal() {
  if (elements.loginModal) {
    if (typeof elements.loginModal.close === 'function') {
      elements.loginModal.close();
    }
    elements.loginModal.classList.remove('active');
    const syncStatusMsg = document.getElementById('sync-settings-status');
    if (syncStatusMsg) syncStatusMsg.textContent = '';
  }
}
