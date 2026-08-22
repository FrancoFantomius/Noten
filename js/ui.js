/**
 * Noten - UI Module Orchestrator
 */

import { state, elements, initElements } from './ui/state.js';
import { initTheme } from './ui/theme.js';
import { closeLightbox } from './ui/utils.js';
import { getDragAfterElement } from './ui/checklist.js';
import {
  initAccountUI,
  showSettings,
  hideSettings,
  updateSyncStatusUI,
  updateProfileUI,
  updateAccountStorageUI,
  showLoginModal,
  hideLoginModal
} from './ui/account.js';
import { initCreatorUI } from './ui/creator.js';
import { initModalUI, openNoteModal, openNewNoteModal } from './ui/modal.js';
import {
  initCardsUI,
  renderNotesFeed,
  renderSidebarTags,
  updateSearchSuggestionsAndTags,
  setCategory
} from './ui/cards.js';

// Re-export what other modules (like app.js) need
export {
  showSettings,
  hideSettings,
  updateSyncStatusUI,
  updateProfileUI,
  showLoginModal,
  hideLoginModal,
  renderNotesFeed,
  updateSearchSuggestionsAndTags,
  setCategory
};

/**
 * Initialize UI event listeners
 */
export function initUI(callbacks) {
  // Bind callbacks to shared state
  state.onSaveNoteCallback = callbacks.onSaveNote;
  state.onDeleteNoteCallback = callbacks.onDeleteNote;
  state.onOpenSettingsCallback = callbacks.onOpenSettings;
  state.onSignoutCallback = callbacks.onSignout;

  // Resolve initial active category based on path and hash
  const path = window.location.pathname;
  if (path.endsWith('archive.html')) {
    state.activeCategory = 'archive';
  } else if (path.endsWith('trash.html')) {
    state.activeCategory = 'trash';
  } else {
    const hash = window.location.hash;
    if (hash.startsWith('#tag-')) {
      state.activeCategory = `tag:${decodeURIComponent(hash.substring(5))}`;
    }
  }

  // Resolve DOM references
  initElements();

  // Initialize subcomponents event listeners
  initTheme();
  initAccountUI();
  initCreatorUI();
  initModalUI();
  initCardsUI();

  // FAB Event Handler
  if (elements.btnFabCreate) {
    elements.btnFabCreate.addEventListener('click', () => {
      openNewNoteModal();
    });
  }

  // Lightbox Modal closing event listeners
  if (elements.btnLightboxClose) {
    elements.btnLightboxClose.addEventListener('click', closeLightbox);
  }
  if (elements.lightboxModal) {
    elements.lightboxModal.addEventListener('click', (e) => {
      if (e.target === elements.lightboxModal || e.target.closest('.lightbox-content')) {
        closeLightbox();
      }
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.lightboxModal && elements.lightboxModal.classList.contains('active')) {
      closeLightbox();
    }
  });

  // Set up dragover for checklist containers to support reordering
  if (elements.modalChecklistView && elements.creatorChecklistView) {
    [elements.modalChecklistView, elements.creatorChecklistView].forEach((container) => {
      container.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingElement = container.querySelector('.modal-checklist-item.dragging');
        if (!draggingElement) return;

        const afterElement = getDragAfterElement(container, e.clientY);
        const addButton = container.querySelector('.modal-checklist-add');

        if (afterElement == null) {
          if (addButton) {
            container.insertBefore(draggingElement, addButton);
          } else {
            container.appendChild(draggingElement);
          }
        } else {
          container.insertBefore(draggingElement, afterElement);
        }
      });
    });
  }


}

/**
 * Notes Feed Updates (Local Render)
 */
export function updateNotesData(notes) {
  state.decryptedNotes = notes;
  renderNotesFeed();
  renderSidebarTags();
  updateSearchSuggestionsAndTags();
  updateAccountStorageUI();

  if (!state.editingNoteId && window.location.hash) {
    const hash = window.location.hash;
    if (hash.length > 1 && !hash.startsWith('#tag-')) {
      const targetId = hash.substring(1);
      const note = state.decryptedNotes.find(n => n.id === targetId);
      if (note) {
        openNoteModal(note.id);
      }
    }
  }
}

/**
 * Re-render all dynamic UI components when the language is changed.
 */
export function retranslateDynamicUI() {
  renderNotesFeed();
  renderSidebarTags();
  updateSearchSuggestionsAndTags();
  updateAccountStorageUI();
  updateSyncStatusUI(state.currentSyncStatus);
}
