/**
 * Noten UI - Feed Cards and Sidebar Navigation
 */

import { t } from '../i18n.js';
import { state, elements } from './state.js';
import { escapeHtml, formatDate, openLightbox } from './utils.js';
import { hasChecklistItems, buildChecklistDOM } from './checklist.js';
import { openNoteModal, saveAndCloseModal } from './modal.js';
import { showSettings, hideSettings } from './account.js';

/**
 * Initializes sidebar toggling, search input listeners, sidebar navigations, and hash change event listeners
 */
export function initCardsUI() {
  if (elements.btnSidebarToggle) {
    elements.btnSidebarToggle.addEventListener('click', toggleSidebar);
  }

  if (elements.btnSidebarCloseMobile) {
    elements.btnSidebarCloseMobile.addEventListener('click', toggleSidebar);
  }

  if (elements.sidebarOverlay) {
    elements.sidebarOverlay.addEventListener('click', toggleSidebar);
  }

  // Sidebar Category Navigation
  elements.navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const category = btn.getAttribute('data-category');
      const currentPath = window.location.pathname;

      const isNotesPage = !currentPath.endsWith('archive.html') && !currentPath.endsWith('trash.html');
      const isArchivePage = currentPath.endsWith('archive.html');
      const isTrashPage = currentPath.endsWith('trash.html');

      let shouldPreventDefault = false;
      if (category === 'notes' && isNotesPage) {
        shouldPreventDefault = true;
      } else if (category === 'archive' && isArchivePage) {
        shouldPreventDefault = true;
      } else if (category === 'trash' && isTrashPage) {
        shouldPreventDefault = true;
      }

      if (shouldPreventDefault) {
        e.preventDefault();
        elements.navItems.forEach(i => i.classList.remove('active'));
        btn.classList.add('active');

        // Clear hash and tag highlight when switching to a main category in-memory
        if (window.location.hash) {
          history.pushState("", document.title, window.location.pathname);
        }
        setCategory(category);
      }
    });
  });

  // Search Live Filtering
  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', (e) => {
      const val = e.target.value.trim().toLowerCase();
      if (elements.btnSearchClear) {
        elements.btnSearchClear.classList.toggle('hidden', val === '');
      }
      renderNotesFeed();
    });
  }

  if (elements.btnSearchClear) {
    elements.btnSearchClear.addEventListener('click', () => {
      elements.searchInput.value = '';
      elements.btnSearchClear.classList.add('hidden');
      renderNotesFeed();
    });
  }

  // Window hashchange listener for browser history navigation
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash;
    const currentPath = window.location.pathname;
    const isNotesPage = !currentPath.endsWith('archive.html') && !currentPath.endsWith('trash.html');

    // Handle Settings modal hash navigation
    const isSettingsOpen = elements.settingsModal && elements.settingsModal.classList.contains('active');
    if (isSettingsOpen && hash !== '#settings') {
      hideSettings();
    } else if (!isSettingsOpen && hash === '#settings') {
      showSettings();
      return;
    }

    // If modal is currently open for a note, but URL hash no longer matches that note
    if (state.editingNoteId && hash !== `#${state.editingNoteId}`) {
      saveAndCloseModal();
    }

    // If modal is closed and hash matches a note in decryptedNotes
    if (!state.editingNoteId && hash.length > 1 && !hash.startsWith('#tag-') && hash !== '#settings') {
      const targetId = hash.substring(1);
      const targetNote = state.decryptedNotes.find(n => n.id === targetId);
      if (targetNote) {
        openNoteModal(targetNote.id);
        return;
      }
    }

    if (isNotesPage) {
      if (hash.startsWith('#tag-')) {
        const tag = decodeURIComponent(hash.substring(5));
        setCategory(`tag:${tag}`);
      } else if (!hash || hash === '#') {
        if (state.activeCategory.startsWith('tag:')) {
          setCategory('notes');
        }
      }
    }
  });
}

/**
 * Sidebar Navigation Toggling
 */
export function toggleSidebar() {
  if (!elements.sidebar) return;

  // On mobile, use separate class to display slide-in overlay
  if (window.innerWidth <= 768) {
    const isMobileOpen = elements.sidebar.classList.toggle('mobile-open');
    if (elements.sidebarOverlay) {
      elements.sidebarOverlay.classList.toggle('active', isMobileOpen);
    }
  } else {
    elements.sidebar.classList.toggle('collapsed');
  }
}

/**
 * Switch active categories
 */
export function setCategory(category) {
  state.activeCategory = category;

  // Close mobile sidebar on select
  if (elements.sidebar) {
    elements.sidebar.classList.remove('mobile-open');
  }
  if (elements.sidebarOverlay) {
    elements.sidebarOverlay.classList.remove('active');
  }

  // Highlight sidebar item if it's main category
  elements.navItems.forEach(i => {
    const dataCat = i.getAttribute('data-category');
    if (category === dataCat) {
      i.classList.add('active');
    } else {
      i.classList.remove('active');
    }
  });

  // Highlights tag lists
  if (elements.sidebarTagsList) {
    const tagBtns = elements.sidebarTagsList.querySelectorAll('.tag-btn');
    tagBtns.forEach(btn => {
      const tagVal = btn.getAttribute('data-tag');
      if (`tag:${tagVal}` === category) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Adjust placeholder empty states based on category
  updateEmptyStateDetails();

  // Re-render the notes list
  renderNotesFeed();
}

/**
 * Empty status updater
 */
export function updateEmptyStateDetails() {
  if (!elements.emptyStateTitle || !elements.emptyStateDesc) return;

  if (state.activeCategory === 'notes') {
    elements.emptyStateTitle.textContent = t('empty_state_notes_title');
    elements.emptyStateDesc.textContent = t('empty_state_notes_desc');
  } else if (state.activeCategory === 'archive') {
    elements.emptyStateTitle.textContent = t('empty_state_archive_title');
    elements.emptyStateDesc.textContent = t('empty_state_archive_desc');
  } else if (state.activeCategory === 'trash') {
    elements.emptyStateTitle.textContent = t('empty_state_trash_title');
    elements.emptyStateDesc.textContent = t('empty_state_trash_desc');
  } else if (state.activeCategory.startsWith('tag:')) {
    const tag = state.activeCategory.substring(4);
    elements.emptyStateTitle.textContent = t('empty_state_tags_title', { tag: tag });
    elements.emptyStateDesc.textContent = t('empty_state_tags_desc');
  }
}

/**
 * Filter and render note grid cards
 */
export function renderNotesFeed() {
  const searchQuery = elements.searchInput ? elements.searchInput.value.trim().toLowerCase() : '';

  // Filter notes by category, tags, and search
  const filtered = state.decryptedNotes.filter(note => {
    // 1. Category/Search Filter
    if (searchQuery) {
      if (note.isTrashed) return false;
      if (state.activeCategory.startsWith('tag:')) {
        const targetTag = state.activeCategory.substring(4);
        if (!note.tags.includes(targetTag)) return false;
      }
    } else {
      if (state.activeCategory === 'notes') {
        if (note.isArchived || note.isTrashed) return false;
      } else if (state.activeCategory === 'archive') {
        if (!note.isArchived || note.isTrashed) return false;
      } else if (state.activeCategory === 'trash') {
        if (!note.isTrashed) return false;
      } else if (state.activeCategory.startsWith('tag:')) {
        const targetTag = state.activeCategory.substring(4);
        if (note.isTrashed || !note.tags.includes(targetTag)) return false;
      }
    }

    // 2. Search Query Matching
    if (searchQuery) {
      const matchTitle = note.title.toLowerCase().includes(searchQuery);
      const matchBody = note.body.toLowerCase().includes(searchQuery);
      const matchTags = note.tags.some(tag => tag.toLowerCase().includes(searchQuery));
      return matchTitle || matchBody || matchTags;
    }

    return true;
  });

  // Sort notes by updatedAt desc
  filtered.sort((a, b) => b.updatedAt - a.updatedAt);

  // Group into Pinned and Unpinned
  const pinned = filtered.filter(n => n.isPinned);
  const unpinned = filtered.filter(n => !n.isPinned);

  // Show pinned section only if there are pinned notes, we are in 'notes' category, and NOT searching
  const showPinnedSection = pinned.length > 0 && state.activeCategory === 'notes' && !searchQuery;

  // Render Pinned Section
  if (showPinnedSection) {
    if (elements.pinnedSection) elements.pinnedSection.classList.remove('hidden');
    renderCardsToGrid(pinned, elements.pinnedGrid);
  } else {
    if (elements.pinnedSection) elements.pinnedSection.classList.add('hidden');
    if (elements.pinnedGrid) elements.pinnedGrid.innerHTML = '';
  }

  // Render Unpinned Section (or all notes if pinned section is hidden)
  const mainGridNotes = showPinnedSection ? unpinned : filtered;
  if (mainGridNotes.length > 0) {
    renderCardsToGrid(mainGridNotes, elements.notesGrid);
    if (showPinnedSection) {
      if (elements.sectionTitleFeed) elements.sectionTitleFeed.classList.remove('hidden');
    } else {
      if (elements.sectionTitleFeed) elements.sectionTitleFeed.classList.add('hidden');
    }
  } else {
    if (elements.notesGrid) elements.notesGrid.innerHTML = '';
    if (elements.sectionTitleFeed) elements.sectionTitleFeed.classList.add('hidden');
  }

  // Handle Empty State display
  if (filtered.length === 0) {
    if (searchQuery) {
      if (elements.emptyStateTitle) elements.emptyStateTitle.textContent = t('empty_state_search_title');
      if (elements.emptyStateDesc) elements.emptyStateDesc.textContent = t('empty_state_search_desc');
    } else {
      updateEmptyStateDetails();
    }
    if (elements.emptyState) elements.emptyState.classList.remove('hidden');
    if (elements.notesViewContent) elements.notesViewContent.classList.add('hidden');
  } else {
    if (elements.emptyState) elements.emptyState.classList.add('hidden');
    if (elements.notesViewContent) elements.notesViewContent.classList.remove('hidden');
  }


}

export function renderCardsToGrid(notes, gridElement) {
  if (!gridElement) return;
  gridElement.innerHTML = '';

  notes.forEach(note => {
    const card = document.createElement('div');
    card.className = `note-card color-${note.color || 'default'}`;
    card.setAttribute('data-id', note.id);

    const isTruncated = note.body.length > 300;
    const bodyText = isTruncated ? note.body.substring(0, 300) : note.body;

    let tagsHtml = '';
    if (note.tags && note.tags.length > 0) {
      tagsHtml = `
        <div class="card-tags">
          ${note.tags.map(t => `<span class="card-tag">#${t}</span>`).join('')}
        </div>
      `;
    }

    let coverHtml = '';
    if (note.images && note.images.length > 0) {
      coverHtml = `
        <div class="note-card-image">
          ${generateImageGridHtml(note.images)}
        </div>
      `;
    }

    const isChecklist = hasChecklistItems(note.body);
    card.innerHTML = `
      ${coverHtml}
      ${!note.isTrashed ? `
      <button class="btn-icon note-card-pin ${note.isPinned ? 'active' : ''}" title="${note.isPinned ? t('btn_unpin_note_title') : t('btn_pin_note_title')}">
        <span class="material-symbols-outlined">keep</span>
      </button>
      ` : ''}
      ${note.title ? `<h3 class="note-card-title">${escapeHtml(note.title)}</h3>` : ''}
      ${note.body && !isChecklist ? `<div class="note-card-body ${isTruncated ? 'truncated' : ''}">${escapeHtml(bodyText)}</div>` : ''}
      ${tagsHtml}
      <div class="note-card-footer">
        <span>${formatDate(note.updatedAt)}</span>
        ${note.isTrashed ? `
          <div class="note-card-trash-actions">
            <button class="btn-icon btn-card-restore" title="${t('btn_modal_trash_restore_title')}">
              <span class="material-symbols-outlined">restore</span>
            </button>
            <button class="btn-icon btn-card-delete-forever" title="${t('btn_modal_trash_delete_forever_title')}">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        ` : ''}
      </div>
    `;

    if (note.body && isChecklist) {
      const checklistContainer = buildChecklistDOM(bodyText, note.id, isTruncated);
      const titleEl = card.querySelector('.note-card-title');
      const pinBtn = card.querySelector('.note-card-pin');
      const insertAfter = titleEl || pinBtn;
      if (insertAfter && insertAfter.nextSibling) {
        card.insertBefore(checklistContainer, insertAfter.nextSibling);
      } else {
        const tagsEl = card.querySelector('.card-tags');
        const footerEl = card.querySelector('.note-card-footer');
        card.insertBefore(checklistContainer, tagsEl || footerEl);
      }
    }

    card.addEventListener('click', (e) => {
      const pinBtn = card.querySelector('.note-card-pin');
      const restoreBtn = card.querySelector('.btn-card-restore');
      const deleteForeverBtn = card.querySelector('.btn-card-delete-forever');
      const gridImg = e.target.closest('.grid-image-wrapper img');
      const checklistClick = e.target.closest('.checklist-item');

      if (pinBtn && (e.target === pinBtn || pinBtn.contains(e.target))) {
        e.stopPropagation();
        toggleNotePin(note.id);
      } else if (restoreBtn && (e.target === restoreBtn || restoreBtn.contains(e.target))) {
        e.stopPropagation();
        restoreNote(note.id);
      } else if (deleteForeverBtn && (e.target === deleteForeverBtn || deleteForeverBtn.contains(e.target))) {
        e.stopPropagation();
        deleteNoteForever(note.id);
      } else if (gridImg) {
        e.stopPropagation();
        openLightbox(gridImg.src);
      } else if (checklistClick) {
        e.stopPropagation();
      } else {
        openNoteModal(note.id);
      }
    });

    gridElement.appendChild(card);
  });
}

export async function toggleNotePin(noteId) {
  const note = state.decryptedNotes.find(n => n.id === noteId);
  if (note) {
    note.isPinned = !note.isPinned;
    note.updatedAt = Date.now();
    if (state.onSaveNoteCallback) {
      await state.onSaveNoteCallback(note.id, note);
    }
  }
}

export async function restoreNote(noteId) {
  const note = state.decryptedNotes.find(n => n.id === noteId);
  if (note) {
    note.isTrashed = false;
    note.trashedAt = null;
    note.updatedAt = Date.now();
    if (state.onSaveNoteCallback) {
      await state.onSaveNoteCallback(note.id, note);
    }
  }
}

export async function deleteNoteForever(noteId) {
  const note = state.decryptedNotes.find(n => n.id === noteId);
  if (note) {
    if (confirm(t('confirm_delete_note'))) {
      if (state.onDeleteNoteCallback) {
        await state.onDeleteNoteCallback(note.id);
      }
    }
  }
}

/**
 * Generates responsive image grid HTML string for note cards.
 */
export function generateImageGridHtml(images) {
  if (!images || images.length === 0) return '';

  const numCols = Math.min(images.length, 2);
  const colsHtml = Array.from({ length: numCols }, () => []);
  const displayImages = images.slice(0, 4);

  displayImages.forEach((imgSrc, index) => {
    colsHtml[index % numCols].push(`
      <div class="grid-image-wrapper">
        <img src="${imgSrc}" alt="Attached image ${index + 1}">
      </div>
    `);
  });

  const colsFormatted = colsHtml.map(colImgs => `
    <div class="image-grid-column">
      ${colImgs.join('')}
    </div>
  `).join('');

  return `<div class="image-grid-row">${colsFormatted}</div>`;
}

/**
 * Render tags in Sidebar List
 */
export function renderSidebarTags() {
  if (!elements.sidebarTagsList) return;
  elements.sidebarTagsList.innerHTML = '';

  // Extract all distinct tags from non-trashed notes
  const tagsSet = new Set();
  state.decryptedNotes.forEach(n => {
    if (!n.isTrashed && n.tags) {
      n.tags.forEach(t => tagsSet.add(t));
    }
  });

  const tags = Array.from(tagsSet).sort();

  if (tags.length === 0) {
    elements.sidebarTagsList.innerHTML = `<li class="sidebar-help-text" style="padding: 8px 12px; font-size: 0.8rem; color: var(--text-secondary);">${t('sidebar_no_tags')}</li>`;
    return;
  }

  tags.forEach(tag => {
    const li = document.createElement('li');
    const isActive = state.activeCategory === `tag:${tag}` ? 'active' : '';

    li.innerHTML = `
      <button class="tag-btn ${isActive}" data-tag="${tag}">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span class="material-symbols-outlined" style="font-size: 18px;">tag</span>
          <span>${escapeHtml(tag)}</span>
        </div>
      </button>
    `;

    li.querySelector('button').addEventListener('click', (e) => {
      const currentPath = window.location.pathname;
      const isNotesPage = !currentPath.endsWith('archive.html') && !currentPath.endsWith('trash.html');

      if (isNotesPage) {
        window.location.hash = `tag-${encodeURIComponent(tag)}`;
        setCategory(`tag:${tag}`);
      } else {
        window.location.href = `index.html#tag-${encodeURIComponent(tag)}`;
      }
    });
    elements.sidebarTagsList.appendChild(li);
  });


}
