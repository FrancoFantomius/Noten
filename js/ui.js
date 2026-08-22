/**
 * Noten - UI Module Orchestrator
 */

import { t } from './i18n.js';
import { state, elements, initElements } from './ui/state.js';
import { initTheme } from './ui/theme.js';
import { closeLightbox, showSnackbar } from './ui/utils.js';
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
  setCategory,
  showSnackbar
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

  // FAB Event Handler & Scroll Auto-retraction with Animation
  if (elements.btnFabCreate) {
    elements.btnFabCreate.addEventListener('click', () => {
      openNewNoteModal();
    });

    // Inject smooth M3 retraction animation styles into md-fab shadow DOM
    const applyFabAnimationStyle = () => {
      if (elements.btnFabCreate && elements.btnFabCreate.shadowRoot) {
        if (!elements.btnFabCreate.shadowRoot.getElementById('fab-retraction-anim')) {
          const style = document.createElement('style');
          style.id = 'fab-retraction-anim';
          style.textContent = `
            button {
              transition: width 280ms cubic-bezier(0.2, 0, 0, 1),
                          min-width 280ms cubic-bezier(0.2, 0, 0, 1),
                          max-width 280ms cubic-bezier(0.2, 0, 0, 1),
                          padding 280ms cubic-bezier(0.2, 0, 0, 1),
                          box-shadow 200ms cubic-bezier(0.2, 0, 0, 1),
                          background-color 200ms cubic-bezier(0.2, 0, 0, 1) !important;
            }
            .content {
              transition: gap 280ms cubic-bezier(0.2, 0, 0, 1) !important;
            }
            .label {
              display: inline-block !important;
              max-width: 200px;
              opacity: 1;
              transform: scale(1);
              transform-origin: left center;
              transition: max-width 280ms cubic-bezier(0.2, 0, 0, 1),
                          opacity 200ms cubic-bezier(0.2, 0, 0, 1),
                          transform 200ms cubic-bezier(0.2, 0, 0, 1) !important;
              white-space: nowrap;
              overflow: hidden;
            }
            :host([retracted]) button {
              width: 56px !important;
              min-width: 56px !important;
              max-width: 56px !important;
              padding: 0 !important;
            }
            :host([retracted]) .content {
              gap: 0 !important;
            }
            :host([retracted]) .label {
              max-width: 0 !important;
              opacity: 0 !important;
              transform: scale(0.6) !important;
              pointer-events: none !important;
            }
          `;
          elements.btnFabCreate.shadowRoot.appendChild(style);
        }
      }
    };

    applyFabAnimationStyle();
    customElements.whenDefined('md-fab').then(applyFabAnimationStyle);

    let lastScrollTop = 0;
    let scrollTicking = false;

    const handleFabScroll = () => {
      const scrollEl = elements.contentPanel || document.querySelector('.content-panel');
      const currentScrollTop = scrollEl ? scrollEl.scrollTop : (window.scrollY || document.documentElement.scrollTop || 0);

      // Downscroll past threshold (20px) to retract into icon-only (+)
      if (currentScrollTop > 20 && currentScrollTop > lastScrollTop) {
        if (!elements.btnFabCreate.hasAttribute('retracted')) {
          elements.btnFabCreate.setAttribute('retracted', '');
        }
      } else if (currentScrollTop < lastScrollTop || currentScrollTop <= 10) {
        // Upscroll or near top: expand back to "+ New Note"
        if (elements.btnFabCreate.hasAttribute('retracted')) {
          elements.btnFabCreate.removeAttribute('retracted');
        }
      }

      lastScrollTop = Math.max(0, currentScrollTop);
      scrollTicking = false;
    };

    const onScrollThrottled = () => {
      if (!scrollTicking) {
        window.requestAnimationFrame(handleFabScroll);
        scrollTicking = true;
      }
    };

    if (elements.contentPanel) {
      elements.contentPanel.addEventListener('scroll', onScrollThrottled, { passive: true });
    }
    window.addEventListener('scroll', onScrollThrottled, { passive: true });
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
