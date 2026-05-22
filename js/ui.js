/**
 * Noten - UI Module
 */

import { t, getLanguage } from './i18n.js';

let activeCategory = 'notes'; // 'notes', 'archive', 'trash', or 'tag:TagName'
let decryptedNotes = [];       // Cache of all decrypted notes in memory
let noteCreatorTags = [];      // Current tags in the note creator
let noteModalTags = [];        // Current tags in the edit modal
let noteCreatorImages = [];    // Current image attachments in creator
let noteModalImages = [];      // Current image attachments in modal
let activeColor = 'default';   // Color chosen in creator
let modalActiveColor = 'default';
let currentSyncStatus = 'offline';

// Callbacks to communicate with app.js controller
let onSaveNoteCallback = null;
let onDeleteNoteCallback = null;
let onLockAppCallback = null;
let onOpenSettingsCallback = null;

// DOM Elements
const elements = {
  appContainer: document.getElementById('app-container'),
  
  // Header
  btnSidebarToggle: document.getElementById('btn-sidebar-toggle'),
  sidebar: document.getElementById('app-sidebar'),
  searchInput: document.getElementById('search-input'),
  btnSearchClear: document.getElementById('btn-search-clear'),
  syncStatus: document.getElementById('sync-status'),
  btnSettingsOpen: document.getElementById('btn-settings-open'),
  
  // Navigation items
  navItems: document.querySelectorAll('.nav-item'),
  sidebarTagsList: document.getElementById('sidebar-tags-list'),
  
  // Note Creator
  noteCreator: document.getElementById('note-creator'),
  creatorCollapsed: document.getElementById('creator-collapsed'),
  creatorExpanded: document.getElementById('creator-expanded'),
  creatorTitle: document.getElementById('creator-title'),
  creatorBody: document.getElementById('creator-body'),
  creatorTagsList: document.getElementById('creator-tags-list'),
  creatorTagInput: document.getElementById('creator-tag-input'),
  btnCreatorPin: document.getElementById('btn-creator-pin'),
  btnCreatorArchive: document.getElementById('btn-creator-archive'),
  btnCreatorClose: document.getElementById('btn-creator-close'),
  btnQuickTodo: document.getElementById('btn-quick-todo'),
  btnCreatorImage: document.getElementById('btn-creator-image'),
  creatorImageInput: document.getElementById('creator-image-input'),
  creatorImagesPreview: document.getElementById('creator-images-preview'),
  
  // Feeds
  notesViewContent: document.getElementById('notes-view-content'),
  pinnedSection: document.getElementById('pinned-section'),
  pinnedGrid: document.getElementById('pinned-grid'),
  notesSection: document.getElementById('notes-section'),
  sectionTitleFeed: document.getElementById('section-title-feed'),
  notesGrid: document.getElementById('notes-grid'),
  emptyState: document.getElementById('empty-state'),
  emptyStateTitle: document.getElementById('empty-state-title'),
  emptyStateDesc: document.getElementById('empty-state-desc'),
  
  // Note Editor Modal
  noteModal: document.getElementById('note-modal'),
  modalCard: document.getElementById('modal-card-element'),
  modalTitle: document.getElementById('modal-title'),
  modalBodyText: document.getElementById('modal-body-text'),
  modalTagsList: document.getElementById('modal-tags-list'),
  modalTagInput: document.getElementById('modal-tag-input'),
  btnModalPin: document.getElementById('btn-modal-pin'),
  btnModalArchive: document.getElementById('btn-modal-archive'),
  btnModalTrash: document.getElementById('btn-modal-trash'),
  btnModalClose: document.getElementById('btn-modal-close'),
  modalLastEdited: document.getElementById('modal-last-edited'),
  btnModalImage: document.getElementById('btn-modal-image'),
  modalImageInput: document.getElementById('modal-image-input'),
  modalImagesPreview: document.getElementById('modal-images-preview'),
  modalChecklistView: document.getElementById('modal-checklist-view'),
  btnModalChecklistToggle: document.getElementById('btn-modal-checklist-toggle'),
  
  // Settings Modal
  settingsModal: document.getElementById('settings-modal'),
  btnSettingsClose: document.getElementById('btn-settings-close'),
  themeToggle: document.getElementById('theme-toggle'),

  // Lightbox Modal
  lightboxModal: document.getElementById('lightbox-modal'),
  lightboxImage: document.getElementById('lightbox-image'),
  btnLightboxClose: document.getElementById('btn-lightbox-close')
};

// State Variables for Creator/Modal
let isCreatorPinned = false;
let isModalPinned = false;
let editingNoteId = null;
let isModalChecklistMode = false;

/**
 * Initialize UI event listeners
 */
export function initUI(callbacks) {
  onSaveNoteCallback = callbacks.onSaveNote;
  onDeleteNoteCallback = callbacks.onDeleteNote;
  onOpenSettingsCallback = callbacks.onOpenSettings;
  
  // Header Actions
  elements.btnSidebarToggle.addEventListener('click', toggleSidebar);
  elements.btnSettingsOpen.addEventListener('click', () => {
    if (onOpenSettingsCallback) onOpenSettingsCallback();
  });
  
  // Theme Toggle
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

  // Apply saved theme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    elements.themeToggle.checked = false;
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
  } else {
    elements.themeToggle.checked = true;
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
  }

  // Sidebar Category Navigation
  elements.navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      elements.navItems.forEach(i => i.classList.remove('active'));
      const btn = e.currentTarget;
      btn.classList.add('active');
      
      const category = btn.getAttribute('data-category');
      setCategory(category);
    });
  });
  
  // Note Creator Focus / Expand Actions
  elements.creatorCollapsed.addEventListener('click', expandNoteCreator);
  elements.btnCreatorClose.addEventListener('click', closeNoteCreator);
  
  // Auto-Save Note Creator on Clicking Outside
  document.addEventListener('click', (e) => {
    if (!elements.noteCreator.contains(e.target) && !elements.creatorExpanded.classList.contains('hidden')) {
      closeNoteCreator();
    }
  });
  
  // Note Creator Tag adding
  elements.creatorTagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = elements.creatorTagInput.value.trim().toLowerCase();
      if (val && !noteCreatorTags.includes(val)) {
        noteCreatorTags.push(val);
        elements.creatorTagInput.value = '';
        renderCreatorTags();
      }
    }
  });

  // Switch from creator title to creator body on Enter
  elements.creatorTitle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      elements.creatorBody.focus();
    }
  });
  
  // Creator Pin Toggle
  elements.btnCreatorPin.addEventListener('click', () => {
    isCreatorPinned = !isCreatorPinned;
    elements.btnCreatorPin.classList.toggle('active', isCreatorPinned);
  });

  // Creator Color Picker popup handling
  const creatorColors = elements.noteCreator.querySelectorAll('.color-option');
  creatorColors.forEach(opt => {
    opt.addEventListener('click', (e) => {
      creatorColors.forEach(o => o.classList.remove('active'));
      e.target.classList.add('active');
      
      const color = e.target.getAttribute('data-color');
      activeColor = color;
      
      // Update creator container background color classes
      elements.noteCreator.className = `note-creator-container color-${color}`;
    });
  });

  // Quick checklist format helper
  elements.btnQuickTodo.addEventListener('click', (e) => {
    e.stopPropagation();
    expandNoteCreator();
    elements.creatorBody.value = '- [ ] ';
    elements.creatorBody.focus();
  });

  // Creator Image actions
  elements.btnCreatorImage.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.creatorImageInput.click();
  });

  elements.creatorImageInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      try {
        const compressed = await compressImage(file);
        noteCreatorImages.push(compressed);
      } catch (err) {
        console.error('Failed to compress image:', err);
      }
    }
    e.target.value = '';
    renderCreatorImages();
  });
  
  // Edit Modal Event Handlers
  elements.btnModalClose.addEventListener('click', saveAndCloseModal);
  
  // Closing Modal on background click
  elements.noteModal.addEventListener('click', (e) => {
    if (e.target === elements.noteModal) {
      saveAndCloseModal();
    }
  });

  // Close open note modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (editingNoteId) {
        e.preventDefault();
        saveAndCloseModal();
      }
    }
  });

  // Modal Pin Toggle
  elements.btnModalPin.addEventListener('click', () => {
    isModalPinned = !isModalPinned;
    elements.btnModalPin.classList.toggle('active', isModalPinned);
  });

  // Modal Color Picker
  const modalColors = elements.noteModal.querySelectorAll('.color-option');
  modalColors.forEach(opt => {
    opt.addEventListener('click', (e) => {
      modalColors.forEach(o => o.classList.remove('active'));
      e.target.classList.add('active');
      
      const color = e.target.getAttribute('data-color');
      modalActiveColor = color;
      elements.modalCard.className = `modal-card color-${color}`;
    });
  });

  // Modal Tag input adding
  elements.modalTagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = elements.modalTagInput.value.trim().toLowerCase();
      if (val && !noteModalTags.includes(val)) {
        noteModalTags.push(val);
        elements.modalTagInput.value = '';
        renderModalTags();
      }
    }
  });

  // Modal Image actions
  elements.btnModalImage.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.modalImageInput.click();
  });

  elements.modalImageInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      try {
        const compressed = await compressImage(file);
        noteModalImages.push(compressed);
      } catch (err) {
        console.error('Failed to compress image:', err);
      }
    }
    e.target.value = '';
    renderModalImages();
  });

  // Switch from modal title to modal body on Enter
  elements.modalTitle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isModalChecklistMode) {
        const firstInput = elements.modalChecklistView.querySelector('.modal-checklist-input');
        if (firstInput) firstInput.focus();
      } else {
        elements.modalBodyText.focus();
      }
    }
  });

  // Modal Checklist Toggle
  elements.btnModalChecklistToggle.addEventListener('click', () => {
    if (isModalChecklistMode) {
      // Switch to raw text mode: serialize checklist to textarea
      const serialized = serializeModalChecklist();
      elements.modalBodyText.value = serialized;
      elements.modalChecklistView.classList.add('hidden');
      elements.modalChecklistView.innerHTML = '';
      elements.modalBodyText.classList.remove('hidden');
      isModalChecklistMode = false;
      elements.btnModalChecklistToggle.classList.remove('active');
      elements.modalBodyText.focus();
    } else {
      // Switch to checklist mode: parse textarea into checklist
      const bodyText = elements.modalBodyText.value;
      if (hasChecklistItems(bodyText)) {
        renderModalChecklist(bodyText);
        elements.modalChecklistView.classList.remove('hidden');
        elements.modalBodyText.classList.add('hidden');
        isModalChecklistMode = true;
        elements.btnModalChecklistToggle.classList.add('active');
      }
    }
  });

  // Modal Archive Action
  elements.btnModalArchive.addEventListener('click', async () => {
    if (editingNoteId) {
      const note = decryptedNotes.find(n => n.id === editingNoteId);
      if (note) {
        note.isArchived = !note.isArchived;
        note.isPinned = false; // Unpin if archived
        note.updatedAt = Date.now();
        await onSaveNoteCallback(note.id, note);
        closeModal();
      }
    }
  });

  // Modal Trash / Delete Action
  elements.btnModalTrash.addEventListener('click', async () => {
    if (editingNoteId) {
      const note = decryptedNotes.find(n => n.id === editingNoteId);
      if (note) {
        if (note.isTrashed) {
          // If already in trash, permanently delete
          if (confirm(t('confirm_delete_note'))) {
            await onDeleteNoteCallback(note.id);
            closeModal();
          }
        } else {
          // Send to trash
          note.isTrashed = true;
          note.isPinned = false;
          note.updatedAt = Date.now();
          await onSaveNoteCallback(note.id, note);
          closeModal();
        }
      }
    }
  });

  // Search Live Filtering
  elements.searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase();
    elements.btnSearchClear.classList.toggle('hidden', val === '');
    renderNotesFeed();
  });

  elements.btnSearchClear.addEventListener('click', () => {
    elements.searchInput.value = '';
    elements.btnSearchClear.classList.add('hidden');
    renderNotesFeed();
  });

  // Lightbox Modal closing event listeners
  elements.btnLightboxClose.addEventListener('click', closeLightbox);
  elements.lightboxModal.addEventListener('click', (e) => {
    if (e.target === elements.lightboxModal || e.target.closest('.lightbox-content')) {
      closeLightbox();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.lightboxModal.classList.contains('active')) {
      closeLightbox();
    }
  });

  // Initial Lucide Icons rendering
  lucide.createIcons();
}


/**
 * Sidebar Navigation
 */
function toggleSidebar() {
  elements.sidebar.classList.toggle('collapsed');
  
  // On mobile, use separate class to display slide-in overlay
  if (window.innerWidth <= 768) {
    elements.sidebar.classList.toggle('mobile-open');
  }
}

export function setCategory(category) {
  activeCategory = category;
  
  // Close mobile sidebar on select
  elements.sidebar.classList.remove('mobile-open');
  
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
  const tagBtns = elements.sidebarTagsList.querySelectorAll('.tag-btn');
  tagBtns.forEach(btn => {
    const tagVal = btn.getAttribute('data-tag');
    if (`tag:${tagVal}` === category) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Adjust placeholder empty states based on category
  updateEmptyStateDetails();

  // Re-render the notes list
  renderNotesFeed();
}

function updateEmptyStateDetails() {
  if (activeCategory === 'notes') {
    elements.emptyStateTitle.textContent = t('empty_state_notes_title');
    elements.emptyStateDesc.textContent = t('empty_state_notes_desc');
  } else if (activeCategory === 'archive') {
    elements.emptyStateTitle.textContent = t('empty_state_archive_title');
    elements.emptyStateDesc.textContent = t('empty_state_archive_desc');
  } else if (activeCategory === 'trash') {
    elements.emptyStateTitle.textContent = t('empty_state_trash_title');
    elements.emptyStateDesc.textContent = t('empty_state_trash_desc');
  } else if (activeCategory.startsWith('tag:')) {
    const tag = activeCategory.substring(4);
    elements.emptyStateTitle.textContent = t('empty_state_tags_title', { tag: tag });
    elements.emptyStateDesc.textContent = t('empty_state_tags_desc');
  }
}

/**
 * Note Creator Expand / Collapse
 */
function expandNoteCreator() {
  elements.creatorCollapsed.classList.add('hidden');
  elements.creatorExpanded.classList.remove('hidden');
  
  // Set default state
  isCreatorPinned = false;
  elements.btnCreatorPin.classList.remove('active');
  activeColor = 'default';
  elements.noteCreator.className = 'note-creator-container color-default';
  noteCreatorTags = [];
  noteCreatorImages = [];
  renderCreatorTags();
  renderCreatorImages();
  
  // Focus content body
  elements.creatorBody.focus();
}

async function closeNoteCreator() {
  const title = elements.creatorTitle.value.trim();
  const body = elements.creatorBody.value.trim();
  
  // Auto save note if there is any content
  if (title || body || noteCreatorTags.length > 0 || noteCreatorImages.length > 0) {
    const noteId = 'note_' + crypto.randomUUID();
    const noteObj = {
      title: title,
      body: body,
      tags: [...noteCreatorTags],
      color: activeColor,
      isPinned: isCreatorPinned,
      isArchived: false,
      isTrashed: false,
      images: [...noteCreatorImages],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // Call controller save callback
    if (onSaveNoteCallback) {
      await onSaveNoteCallback(noteId, noteObj);
    }
  }
  
  // Reset inputs
  elements.creatorTitle.value = '';
  elements.creatorBody.value = '';
  noteCreatorTags = [];
  noteCreatorImages = [];
  renderCreatorImages();
  
  // Collapse UI
  elements.creatorCollapsed.classList.remove('hidden');
  elements.creatorExpanded.classList.add('hidden');
}

function renderCreatorTags() {
  elements.creatorTagsList.innerHTML = '';
  noteCreatorTags.forEach(tag => {
    const span = document.createElement('span');
    span.className = 'tag-badge';
    span.innerHTML = `
      #${tag}
      <button class="btn-remove-tag" data-tag="${tag}">
        <i data-lucide="x"></i>
      </button>
    `;
    span.querySelector('button').addEventListener('click', (e) => {
      e.stopPropagation();
      const removeVal = e.currentTarget.getAttribute('data-tag');
      noteCreatorTags = noteCreatorTags.filter(t => t !== removeVal);
      renderCreatorTags();
    });
    elements.creatorTagsList.appendChild(span);
  });
  lucide.createIcons();
}

/**
 * Notes Feed Updates (Local Render)
 */
export function updateNotesData(notes) {
  decryptedNotes = notes;
  renderNotesFeed();
  renderSidebarTags();
}

export function renderNotesFeed() {
  const searchQuery = elements.searchInput.value.trim().toLowerCase();
  
  // Filter notes by category, tags, and search
  const filtered = decryptedNotes.filter(note => {
    // 1. Category/Search Filter
    if (searchQuery) {
      // Search across notes and archive (excluding trash)
      if (note.isTrashed) return false;
      if (activeCategory.startsWith('tag:')) {
        const targetTag = activeCategory.substring(4);
        if (!note.tags.includes(targetTag)) return false;
      }
    } else {
      // Normal filtering by active category when not searching
      if (activeCategory === 'notes') {
        if (note.isArchived || note.isTrashed) return false;
      } else if (activeCategory === 'archive') {
        if (!note.isArchived || note.isTrashed) return false;
      } else if (activeCategory === 'trash') {
        if (!note.isTrashed) return false;
      } else if (activeCategory.startsWith('tag:')) {
        const targetTag = activeCategory.substring(4);
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
  const showPinnedSection = pinned.length > 0 && activeCategory === 'notes' && !searchQuery;

  // Render Pinned Section
  if (showPinnedSection) {
    elements.pinnedSection.classList.remove('hidden');
    renderCardsToGrid(pinned, elements.pinnedGrid);
  } else {
    elements.pinnedSection.classList.add('hidden');
    elements.pinnedGrid.innerHTML = '';
  }

  // Render Unpinned Section (or all notes if pinned section is hidden)
  const mainGridNotes = showPinnedSection ? unpinned : filtered;
  if (mainGridNotes.length > 0) {
    renderCardsToGrid(mainGridNotes, elements.notesGrid);
    // Show section title "Notes" only if we have pinned notes active too
    if (showPinnedSection) {
      elements.sectionTitleFeed.classList.remove('hidden');
    } else {
      elements.sectionTitleFeed.classList.add('hidden');
    }
  } else {
    elements.notesGrid.innerHTML = '';
    elements.sectionTitleFeed.classList.add('hidden');
  }

  // Handle Empty State display
  if (filtered.length === 0) {
    if (searchQuery) {
      elements.emptyStateTitle.textContent = t('empty_state_search_title');
      elements.emptyStateDesc.textContent = t('empty_state_search_desc');
    } else {
      updateEmptyStateDetails();
    }
    elements.emptyState.classList.remove('hidden');
    elements.notesViewContent.classList.add('hidden');
  } else {
    elements.emptyState.classList.add('hidden');
    elements.notesViewContent.classList.remove('hidden');
  }

  lucide.createIcons();
}

function renderCardsToGrid(notes, gridElement) {
  gridElement.innerHTML = '';
  
  notes.forEach(note => {
    const card = document.createElement('div');
    card.className = `note-card color-${note.color || 'default'}`;
    card.setAttribute('data-id', note.id);
    
    // Truncate check
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

    // Image attachments grid check
    let coverHtml = '';
    if (note.images && note.images.length > 0) {
      coverHtml = `
        <div class="note-card-image">
          ${generateImageGridHtml(note.images)}
        </div>
      `;
    }

    // Build card HTML (body placeholder will be filled after)
    const isChecklist = hasChecklistItems(note.body);
    card.innerHTML = `
      ${coverHtml}
      <button class="btn-icon note-card-pin ${note.isPinned ? 'active' : ''}" title="${note.isPinned ? t('btn_unpin_note_title') : t('btn_pin_note_title')}">
        <i data-lucide="pin"></i>
      </button>
      ${note.title ? `<h3 class="note-card-title">${escapeHtml(note.title)}</h3>` : ''}
      ${note.body && !isChecklist ? `<div class="note-card-body ${isTruncated ? 'truncated' : ''}">${escapeHtml(bodyText)}</div>` : ''}
      ${tagsHtml}
      <div class="note-card-footer">
        <span>${formatDate(note.updatedAt)}</span>
      </div>
    `;

    // If the note has checklist items, build a rich DOM for them
    if (note.body && isChecklist) {
      const checklistContainer = buildChecklistDOM(bodyText, note.id, isTruncated);
      // Insert after title (or after pin button if no title)
      const titleEl = card.querySelector('.note-card-title');
      const pinBtn = card.querySelector('.note-card-pin');
      const insertAfter = titleEl || pinBtn;
      if (insertAfter && insertAfter.nextSibling) {
        card.insertBefore(checklistContainer, insertAfter.nextSibling);
      } else {
        // fallback: insert before tags or footer
        const tagsEl = card.querySelector('.card-tags');
        const footerEl = card.querySelector('.note-card-footer');
        card.insertBefore(checklistContainer, tagsEl || footerEl);
      }
    }

    // Click Card to Open Modal (Avoid triggering on Pin, checkbox, or grid image clicks)
    card.addEventListener('click', (e) => {
      const pinBtn = card.querySelector('.note-card-pin');
      const gridImg = e.target.closest('.grid-image-wrapper img');
      const checklistClick = e.target.closest('.checklist-item');
      if (pinBtn && (e.target === pinBtn || pinBtn.contains(e.target))) {
        e.stopPropagation();
        toggleNotePin(note.id);
      } else if (gridImg) {
        e.stopPropagation();
        openLightbox(gridImg.src);
      } else if (checklistClick) {
        // Don't open modal when clicking checklist items
        e.stopPropagation();
      } else {
        openNoteModal(note.id);
      }
    });

    gridElement.appendChild(card);
  });
}

async function toggleNotePin(noteId) {
  const note = decryptedNotes.find(n => n.id === noteId);
  if (note) {
    note.isPinned = !note.isPinned;
    note.updatedAt = Date.now();
    await onSaveNoteCallback(note.id, note);
  }
}

/**
 * Render tags in Sidebar List
 */
function renderSidebarTags() {
  elements.sidebarTagsList.innerHTML = '';
  
  // Extract all distinct tags from non-trashed notes
  const tagsSet = new Set();
  decryptedNotes.forEach(n => {
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
    const isActive = activeCategory === `tag:${tag}` ? 'active' : '';
    
    li.innerHTML = `
      <button class="tag-btn ${isActive}" data-tag="${tag}">
        <div style="display: flex; align-items: center; gap: 12px;">
          <i data-lucide="hash" style="width: 16px; height: 16px;"></i>
          <span>${escapeHtml(tag)}</span>
        </div>
      </button>
    `;
    
    li.querySelector('button').addEventListener('click', () => {
      setCategory(`tag:${tag}`);
    });
    elements.sidebarTagsList.appendChild(li);
  });
  lucide.createIcons();
}

/**
 * Note Modal (Edit dialog)
 */
function openNoteModal(noteId) {
  const note = decryptedNotes.find(n => n.id === noteId);
  if (!note) return;

  editingNoteId = noteId;
  elements.modalTitle.value = note.title || '';
  elements.modalBodyText.value = note.body || '';
  isModalPinned = note.isPinned || false;
  elements.btnModalPin.classList.toggle('active', isModalPinned);
  modalActiveColor = note.color || 'default';
  elements.modalCard.className = `modal-card color-${modalActiveColor}`;
  
  // Set color popup selection
  const modalColors = elements.noteModal.querySelectorAll('.color-option');
  modalColors.forEach(opt => {
    const c = opt.getAttribute('data-color');
    opt.classList.toggle('active', c === modalActiveColor);
  });
  
  noteModalTags = [...note.tags];
  renderModalTags();

  noteModalImages = note.images ? [...note.images] : [];
  renderModalImages();
  
  // Setup footer labels
  elements.modalLastEdited.textContent = t('modal_last_edited', { time: formatDate(note.updatedAt) });
  
  // Trash/Archive labels depending on state
  elements.btnModalArchive.innerHTML = note.isArchived ? '<i data-lucide="folder-up"></i>' : '<i data-lucide="archive"></i>';
  elements.btnModalArchive.title = note.isArchived ? t('btn_modal_archive_unarchive_title') : t('btn_modal_archive_title');
  
  elements.btnModalTrash.innerHTML = note.isTrashed ? '<i data-lucide="rotate-ccw"></i>' : '<i data-lucide="trash-2"></i>';
  elements.btnModalTrash.title = note.isTrashed ? t('btn_modal_trash_restore_title') : t('btn_modal_trash_delete_title');
  elements.btnModalTrash.className = note.isTrashed ? 'btn-icon text-green' : 'btn-icon';

  // Checklist mode detection
  const noteHasChecklist = hasChecklistItems(note.body);
  if (noteHasChecklist) {
    isModalChecklistMode = true;
    elements.btnModalChecklistToggle.classList.remove('hidden');
    elements.btnModalChecklistToggle.classList.add('active');
    renderModalChecklist(note.body);
    elements.modalChecklistView.classList.remove('hidden');
    elements.modalBodyText.classList.add('hidden');
  } else {
    isModalChecklistMode = false;
    elements.btnModalChecklistToggle.classList.add('hidden');
    elements.btnModalChecklistToggle.classList.remove('active');
    elements.modalChecklistView.classList.add('hidden');
    elements.modalChecklistView.innerHTML = '';
    elements.modalBodyText.classList.remove('hidden');
  }

  elements.noteModal.classList.add('active');
  lucide.createIcons();
  
  // Focus appropriate element
  if (isModalChecklistMode) {
    const firstInput = elements.modalChecklistView.querySelector('.modal-checklist-input');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  } else {
    setTimeout(() => elements.modalBodyText.focus(), 100);
  }
}

async function saveAndCloseModal() {
  if (!editingNoteId) return;

  const note = decryptedNotes.find(n => n.id === editingNoteId);
  if (note) {
    const titleVal = elements.modalTitle.value.trim();
    // If in checklist mode, serialize the checklist back to text
    const bodyVal = isModalChecklistMode
      ? serializeModalChecklist()
      : elements.modalBodyText.value.trim();
    
    const hasChanged = note.title !== titleVal || 
                       note.body !== bodyVal || 
                       note.color !== modalActiveColor || 
                       note.isPinned !== isModalPinned ||
                       JSON.stringify(note.tags) !== JSON.stringify(noteModalTags) ||
                       JSON.stringify(note.images || []) !== JSON.stringify(noteModalImages);
    
    if (hasChanged) {
      note.title = titleVal;
      note.body = bodyVal;
      note.color = modalActiveColor;
      note.isPinned = isModalPinned;
      note.tags = [...noteModalTags];
      note.images = [...noteModalImages];
      note.updatedAt = Date.now();
      
      await onSaveNoteCallback(note.id, note);
    }
  }

  closeModal();
}

function closeModal() {
  elements.noteModal.classList.remove('active');
  editingNoteId = null;
  noteModalImages = [];
  isModalChecklistMode = false;
  elements.modalChecklistView.innerHTML = '';
  elements.modalChecklistView.classList.add('hidden');
  elements.modalBodyText.classList.remove('hidden');
  elements.btnModalChecklistToggle.classList.add('hidden');
  elements.btnModalChecklistToggle.classList.remove('active');
  renderModalImages();
}

function renderModalTags() {
  elements.modalTagsList.innerHTML = '';
  noteModalTags.forEach(tag => {
    const span = document.createElement('span');
    span.className = 'tag-badge';
    span.innerHTML = `
      #${tag}
      <button class="btn-remove-tag" data-tag="${tag}">
        <i data-lucide="x"></i>
      </button>
    `;
    span.querySelector('button').addEventListener('click', (e) => {
      e.stopPropagation();
      const removeVal = e.currentTarget.getAttribute('data-tag');
      noteModalTags = noteModalTags.filter(t => t !== removeVal);
      renderModalTags();
    });
    elements.modalTagsList.appendChild(span);
  });
  lucide.createIcons();
}

/**
 * Settings Modal trigger
 */
export function showSettings() {
  elements.settingsModal.classList.add('active');
}

export function hideSettings() {
  elements.settingsModal.classList.remove('active');
  // Clear any status messages inside Settings
  document.getElementById('sync-settings-status').textContent = '';
}

// Bind settings close trigger
elements.btnSettingsClose.addEventListener('click', hideSettings);
elements.settingsModal.addEventListener('click', (e) => {
  if (e.target === elements.settingsModal) {
    hideSettings();
  }
});

// Update sync status indicator UI
export function updateSyncStatusUI(status) {
  currentSyncStatus = status;
  const badge = elements.syncStatus;
  badge.className = `sync-badge ${status}`;
  
  let icon = 'cloud-off';
  let text = t('sync_offline');
  
  if (status === 'syncing') {
    icon = 'refresh-cw';
    text = t('sync_syncing');
  } else if (status === 'online') {
    icon = 'cloud-lightning';
    text = t('sync_online');
  } else if (status === 'error') {
    icon = 'cloud-alert';
    text = t('sync_error');
  }
  
  badge.innerHTML = `
    <i data-lucide="${icon}"></i>
    <span class="sync-text">${text}</span>
  `;
  badge.title = t('sync_status_title', { status: text });
  lucide.createIcons();
}

/**
 * Re-render all dynamic UI components when the language is changed.
 */
export function retranslateDynamicUI() {
  renderNotesFeed();
  renderSidebarTags();
  updateSyncStatusUI(currentSyncStatus);
}

// --- Text Utility functions ---

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// --- Checklist Utility functions ---

const CHECKLIST_REGEX = /^- \[([ xX])\] (.*)$/;

/**
 * Returns true if the body text contains any checklist items (- [ ] or - [x]).
 */
function hasChecklistItems(body) {
  if (!body) return false;
  return body.split('\n').some(line => CHECKLIST_REGEX.test(line));
}

/**
 * Builds a DOM element containing rendered checklist items and plain text.
 * Checkboxes are interactive and toggle the note body on click.
 */
function buildChecklistDOM(bodyText, noteId, isTruncated) {
  const container = document.createElement('div');
  container.className = `note-card-body checklist-items ${isTruncated ? 'truncated' : ''}`;

  const lines = bodyText.split('\n');
  let consecutiveText = [];

  const flushTextLines = () => {
    if (consecutiveText.length > 0) {
      const textEl = document.createElement('div');
      textEl.className = 'checklist-text-line';
      textEl.textContent = consecutiveText.join('\n');
      container.appendChild(textEl);
      consecutiveText = [];
    }
  };

  lines.forEach((line, lineIndex) => {
    const match = line.match(CHECKLIST_REGEX);
    if (match) {
      flushTextLines();
      const isChecked = match[1].toLowerCase() === 'x';
      const labelText = match[2];

      const item = document.createElement('div');
      item.className = `checklist-item ${isChecked ? 'checked' : ''}`;

      item.innerHTML = `
        <label class="checklist-checkbox">
          <input type="checkbox" ${isChecked ? 'checked' : ''} data-note-id="${noteId}" data-line-index="${lineIndex}">
          <span class="checklist-checkmark">
            <svg viewBox="0 0 14 14"><polyline points="2.5 7 5.5 10.5 11.5 3.5"></polyline></svg>
          </span>
        </label>
        <span class="checklist-label">${escapeHtml(labelText)}</span>
      `;

      // Toggle handler
      const checkbox = item.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        toggleChecklistItem(noteId, lineIndex, e.target.checked);
        // Immediately update visual state
        item.classList.toggle('checked', e.target.checked);
      });

      // Prevent the label click from bubbling to open the modal
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        // If they clicked on the label text rather than the checkbox, toggle it
        if (!e.target.closest('.checklist-checkbox')) {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      container.appendChild(item);
    } else {
      consecutiveText.push(line);
    }
  });

  flushTextLines();
  return container;
}

/**
 * Toggles a checklist item in the note body at the given line index and saves.
 */
async function toggleChecklistItem(noteId, lineIndex, isChecked) {
  const note = decryptedNotes.find(n => n.id === noteId);
  if (!note) return;

  const lines = note.body.split('\n');
  if (lineIndex >= lines.length) return;

  const match = lines[lineIndex].match(CHECKLIST_REGEX);
  if (!match) return;

  // Replace the checkbox marker
  const newMarker = isChecked ? 'x' : ' ';
  lines[lineIndex] = `- [${newMarker}] ${match[2]}`;
  note.body = lines.join('\n');
  note.updatedAt = Date.now();

  // Update the modal textarea if this note is currently being edited
  if (editingNoteId === noteId) {
    elements.modalBodyText.value = note.body;
  }

  if (onSaveNoteCallback) {
    await onSaveNoteCallback(note.id, note);
  }
}

/**
 * Renders an editable checklist view inside the modal.
 * Each checklist item gets a checkbox + editable text input.
 * Non-checklist lines get an editable text area.
 */
function renderModalChecklist(bodyText) {
  elements.modalChecklistView.innerHTML = '';
  const lines = bodyText.split('\n');
  let consecutiveText = [];

  const flushTextLines = () => {
    if (consecutiveText.length > 0) {
      const textEl = document.createElement('textarea');
      textEl.className = 'modal-checklist-text';
      textEl.value = consecutiveText.join('\n');
      textEl.rows = consecutiveText.length;
      textEl.placeholder = t('checklist_text_placeholder');
      autoResizeTextarea(textEl);
      textEl.addEventListener('input', () => autoResizeTextarea(textEl));
      elements.modalChecklistView.appendChild(textEl);
      consecutiveText = [];
    }
  };

  lines.forEach((line) => {
    const match = line.match(CHECKLIST_REGEX);
    if (match) {
      flushTextLines();
      const isChecked = match[1].toLowerCase() === 'x';
      const labelText = match[2];

      const item = document.createElement('div');
      item.className = `modal-checklist-item ${isChecked ? 'checked' : ''}`;

      item.innerHTML = `
        <label class="checklist-checkbox">
          <input type="checkbox" ${isChecked ? 'checked' : ''}>
          <span class="checklist-checkmark">
            <svg viewBox="0 0 14 14"><polyline points="2.5 7 5.5 10.5 11.5 3.5"></polyline></svg>
          </span>
        </label>
        <input type="text" class="modal-checklist-input" value="">
        <button class="modal-checklist-delete btn-icon" title="${t('checklist_remove_item_title')}">
          <i data-lucide="x"></i>
        </button>
      `;

      // Set value via property to avoid XSS from innerHTML
      item.querySelector('.modal-checklist-input').value = labelText;

      // Checkbox toggle
      const checkbox = item.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', () => {
        item.classList.toggle('checked', checkbox.checked);
      });

      // Delete item
      item.querySelector('.modal-checklist-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        item.remove();
      });

      // Enter key = add new item below
      const textInput = item.querySelector('.modal-checklist-input');
      textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addModalChecklistItem(item);
        } else if (e.key === 'Backspace' && textInput.value === '') {
          e.preventDefault();
          // Focus previous item's input
          const prevItem = item.previousElementSibling;
          if (prevItem && prevItem.classList.contains('modal-checklist-item')) {
            const prevInput = prevItem.querySelector('.modal-checklist-input');
            if (prevInput) prevInput.focus();
          }
          item.remove();
        }
      });

      elements.modalChecklistView.appendChild(item);
    } else {
      consecutiveText.push(line);
    }
  });

  flushTextLines();

  // Add "new item" button
  const addBtn = document.createElement('button');
  addBtn.className = 'modal-checklist-add';
  addBtn.innerHTML = '<i data-lucide="plus"></i> <span>' + t('checklist_add_item') + '</span>';
  addBtn.addEventListener('click', () => {
    addModalChecklistItem(null);
  });
  elements.modalChecklistView.appendChild(addBtn);

  lucide.createIcons();
}

/**
 * Adds a new empty checklist item to the modal checklist view.
 * @param {HTMLElement|null} afterItem - Insert after this item, or at the end if null.
 */
function addModalChecklistItem(afterItem) {
  const item = document.createElement('div');
  item.className = 'modal-checklist-item';

  item.innerHTML = `
    <label class="checklist-checkbox">
      <input type="checkbox">
      <span class="checklist-checkmark">
        <svg viewBox="0 0 14 14"><polyline points="2.5 7 5.5 10.5 11.5 3.5"></polyline></svg>
      </span>
    </label>
    <input type="text" class="modal-checklist-input" value="">
    <button class="modal-checklist-delete btn-icon" title="${t('checklist_remove_item_title')}">
      <i data-lucide="x"></i>
    </button>
  `;

  const checkbox = item.querySelector('input[type="checkbox"]');
  checkbox.addEventListener('change', () => {
    item.classList.toggle('checked', checkbox.checked);
  });

  item.querySelector('.modal-checklist-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    item.remove();
  });

  const textInput = item.querySelector('.modal-checklist-input');
  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addModalChecklistItem(item);
    } else if (e.key === 'Backspace' && textInput.value === '') {
      e.preventDefault();
      const prevItem = item.previousElementSibling;
      if (prevItem && prevItem.classList.contains('modal-checklist-item')) {
        const prevInput = prevItem.querySelector('.modal-checklist-input');
        if (prevInput) prevInput.focus();
      }
      item.remove();
    }
  });

  // Insert after the specified item, or before the add button
  const addButton = elements.modalChecklistView.querySelector('.modal-checklist-add');
  if (afterItem && afterItem.nextSibling) {
    elements.modalChecklistView.insertBefore(item, afterItem.nextSibling);
  } else if (addButton) {
    elements.modalChecklistView.insertBefore(item, addButton);
  } else {
    elements.modalChecklistView.appendChild(item);
  }

  lucide.createIcons();
  textInput.focus();
}

/**
 * Serializes the modal checklist view back to plain text with - [ ] / - [x] syntax.
 */
function serializeModalChecklist() {
  const children = elements.modalChecklistView.children;
  const lines = [];

  for (const child of children) {
    if (child.classList.contains('modal-checklist-item')) {
      const checkbox = child.querySelector('input[type="checkbox"]');
      const textInput = child.querySelector('.modal-checklist-input');
      const marker = checkbox.checked ? 'x' : ' ';
      lines.push(`- [${marker}] ${textInput.value}`);
    } else if (child.classList.contains('modal-checklist-text')) {
      lines.push(child.value);
    }
    // Skip the add button
  }

  return lines.join('\n').trim();
}

/**
 * Auto-resize a textarea to fit its content.
 */
function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const lang = getLanguage();
  
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  }
  
  // check if this year
  const isThisYear = date.getFullYear() === now.getFullYear();
  if (isThisYear) {
    return date.toLocaleDateString(lang, { month: 'short', day: 'numeric' });
  }
  
  return date.toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Compress image using Canvas API
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const maxDim = 1024;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress as JPEG at 75% quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

function renderCreatorImages() {
  const container = elements.creatorImagesPreview;
  renderImageGrid(container, noteCreatorImages, true, (index) => {
    noteCreatorImages.splice(index, 1);
    renderCreatorImages();
  });
}

function renderModalImages() {
  const container = elements.modalImagesPreview;
  renderImageGrid(container, noteModalImages, true, (index) => {
    noteModalImages.splice(index, 1);
    renderModalImages();
  });
}

/**
 * Generates responsive image grid HTML string for note cards.
 */
function generateImageGridHtml(images) {
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
 * Renders interactive responsive image grid dynamically inside a DOM container.
 */
function renderImageGrid(container, images, isEditable, onRemove) {
  if (!container) return;
  
  container.innerHTML = '';
  if (!images || images.length === 0) {
    container.classList.add('hidden');
    return;
  }
  
  container.classList.remove('hidden');

  const row = document.createElement('div');
  row.className = 'image-grid-row';

  const numCols = Math.min(images.length, 4);
  const cols = Array.from({ length: numCols }, () => {
    const col = document.createElement('div');
    col.className = 'image-grid-column';
    return col;
  });

  images.forEach((imgSrc, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'grid-image-wrapper';

    const img = document.createElement('img');
    img.src = imgSrc;
    img.alt = `Attached image ${index + 1}`;
    img.style.cursor = 'pointer';
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      openLightbox(imgSrc);
    });
    wrapper.appendChild(img);

    if (isEditable) {
      const btn = document.createElement('button');
      btn.className = 'btn-remove-image';
      btn.setAttribute('data-index', index);
      btn.title = t('btn_remove_image_title');
      btn.innerHTML = '<i data-lucide="x"></i>';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onRemove(index);
      });
      wrapper.appendChild(btn);
    }

    cols[index % numCols].appendChild(wrapper);
  });

  cols.forEach(col => row.appendChild(col));
  container.appendChild(row);
  lucide.createIcons();
}

/**
 * Opens the fullscreen image lightbox.
 */
function openLightbox(src) {
  elements.lightboxImage.src = src;
  elements.lightboxModal.classList.add('active');
  elements.lightboxModal.classList.remove('hidden');
}

/**
 * Closes the fullscreen image lightbox.
 */
function closeLightbox() {
  elements.lightboxModal.classList.remove('active');
  setTimeout(() => {
    if (!elements.lightboxModal.classList.contains('active')) {
      elements.lightboxModal.classList.add('hidden');
      elements.lightboxImage.src = '';
    }
  }, 200);
}
