/**
 * Noten UI - Account and Settings Controls
 */

import { t } from '../i18n.js';
import { state, elements } from './state.js';

/**
 * Initializes account dropdown, profile actions, settings, and login modal event listeners
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

  if (elements.settingsModal) {
    elements.settingsModal.addEventListener('click', (e) => {
      if (e.target === elements.settingsModal) {
        hideSettings();
      }
    });
  }

  // Account Dropdown & Profile Actions
  if (elements.btnDropdownSettings) {
    elements.btnDropdownSettings.addEventListener('click', () => {
      elements.accountDropdown.style.display = 'none';
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
      if (elements.btnSyncProfile && elements.btnSyncProfile.style.display !== 'none') {
        const isVisible = elements.accountDropdown.style.display === 'flex';
        elements.accountDropdown.style.display = isVisible ? 'none' : 'flex';
      } else {
        showLoginModal();
      }
    });
  }

  // Bind close/cancel listeners for the dedicated login modal
  if (elements.btnLoginClose) {
    elements.btnLoginClose.addEventListener('click', hideLoginModal);
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
  }

  if (elements.btnSyncProfile) {
    elements.btnSyncProfile.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = elements.accountDropdown.style.display === 'flex';
      elements.accountDropdown.style.display = isVisible ? 'none' : 'flex';
    });
  }

  if (elements.btnDropdownSignout) {
    elements.btnDropdownSignout.addEventListener('click', () => {
      elements.accountDropdown.style.display = 'none';
      if (state.onSignoutCallback) state.onSignoutCallback();
    });
  }

  if (elements.btnDropdownPurge) {
    elements.btnDropdownPurge.addEventListener('click', () => {
      elements.accountDropdown.style.display = 'none';
      if (state.onPurgeCallback) state.onPurgeCallback();
    });
  }

  document.addEventListener('click', (e) => {
    if (elements.accountDropdown && elements.accountDropdown.style.display === 'flex') {
      if (!elements.accountDropdown.contains(e.target) &&
        (!elements.btnSyncProfile || !elements.btnSyncProfile.contains(e.target)) &&
        (!elements.syncStatus || !elements.syncStatus.contains(e.target))) {
        elements.accountDropdown.style.display = 'none';
      }
    }
  });
}

/**
 * Settings Modal trigger
 */
export function showSettings() {
  if (elements.settingsModal) {
    elements.settingsModal.classList.add('active');
  }
}

export function hideSettings() {
  if (elements.settingsModal) {
    elements.settingsModal.classList.remove('active');
  }
  const statusMsg = document.getElementById('sync-settings-status');
  if (statusMsg) statusMsg.textContent = '';
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
    text = t('sync_online');
  } else if (status === 'error') {
    icon = 'cloud_off';
    text = t('sync_error');
  }

  badge.innerHTML = `
    <span class="material-symbols-outlined">${icon}</span>
    <span class="sync-text">${text}</span>
  `;
  badge.title = t('sync_status_title', { status: text });
}

/**
 * Update the profile UI elements based on sync settings state
 */
export function updateProfileUI(syncSettings) {
  if (!elements.btnSyncLogin || !elements.btnSyncProfile) return;

  const isSyncActive = syncSettings && syncSettings.enabled && (syncSettings.apiKey || syncSettings.email);

  if (isSyncActive) {
    elements.btnSyncLogin.style.display = 'none';
    elements.btnSyncProfile.style.display = 'inline-flex';

    const email = syncSettings.email || '';
    const username = syncSettings.username || email.split('@')[0] || 'Connected';

    if (elements.dropdownEmail) elements.dropdownEmail.textContent = email;
    if (elements.dropdownUsername) elements.dropdownUsername.textContent = username;

    const letter = (username || email || '?').charAt(0).toUpperCase();

    if (syncSettings.avatarURL) {
      if (elements.headerProfileAvatar) {
        elements.headerProfileAvatar.src = syncSettings.avatarURL;
        elements.headerProfileAvatar.style.display = 'block';
      }
      if (elements.headerProfileLetter) elements.headerProfileLetter.style.display = 'none';
      if (elements.headerProfileIcon) elements.headerProfileIcon.style.display = 'none';

      if (elements.headerProfileAvatar) {
        elements.headerProfileAvatar.onerror = () => {
          elements.headerProfileAvatar.style.display = 'none';
          if (elements.headerProfileLetter) {
            elements.headerProfileLetter.textContent = letter;
            elements.headerProfileLetter.style.display = 'flex';
          }
        };
      }
    } else {
      if (elements.headerProfileAvatar) elements.headerProfileAvatar.style.display = 'none';
      if (elements.headerProfileLetter) {
        elements.headerProfileLetter.textContent = letter;
        elements.headerProfileLetter.style.display = 'flex';
      }
      if (elements.headerProfileIcon) elements.headerProfileIcon.style.display = 'none';
    }

    if (syncSettings.avatarURL) {
      if (elements.dropdownAvatar) {
        elements.dropdownAvatar.src = syncSettings.avatarURL;
        elements.dropdownAvatar.style.display = 'block';
      }
      if (elements.dropdownLetter) elements.dropdownLetter.style.display = 'none';
      if (elements.dropdownIcon) elements.dropdownIcon.style.display = 'none';

      if (elements.dropdownAvatar) {
        elements.dropdownAvatar.onerror = () => {
          elements.dropdownAvatar.style.display = 'none';
          if (elements.dropdownLetter) {
            elements.dropdownLetter.textContent = letter;
            elements.dropdownLetter.style.display = 'flex';
          }
        };
      }
    } else {
      if (elements.dropdownAvatar) elements.dropdownAvatar.style.display = 'none';
      if (elements.dropdownLetter) {
        elements.dropdownLetter.textContent = letter;
        elements.dropdownLetter.style.display = 'flex';
      }
      if (elements.dropdownIcon) elements.dropdownIcon.style.display = 'none';
    }
  } else {
    elements.btnSyncLogin.style.display = 'inline-flex';
    elements.btnSyncProfile.style.display = 'none';
    if (elements.accountDropdown) elements.accountDropdown.style.display = 'none';
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Open the dedicated login/sync modal
 */
export function showLoginModal() {
  if (elements.loginModal) {
    elements.loginModal.classList.add('active');
  }
}

/**
 * Close the dedicated login/sync modal and reset status
 */
export function hideLoginModal() {
  if (elements.loginModal) {
    elements.loginModal.classList.remove('active');
    const syncStatusMsg = document.getElementById('sync-settings-status');
    if (syncStatusMsg) syncStatusMsg.textContent = '';
  }
}
