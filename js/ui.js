/**
 * Noten - UI Module
 */

let activeCategory = 'notes'; // 'notes', 'archive', 'trash', or 'tag:TagName'
let decryptedNotes = [];       // Cache of all decrypted notes in memory
let noteCreatorTags = [];      // Current tags in the note creator
let noteModalTags = [];        // Current tags in the edit modal
let noteCreatorImages = [];    // Current image attachments in creator
let noteModalImages = [];      // Current image attachments in modal
let activeColor = 'default';   // Color chosen in creator
let modalActiveColor = 'default';

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
  
  // Settings Modal
  settingsModal: document.getElementById('settings-modal'),
  btnSettingsClose: document.getElementById('btn-settings-close'),
  themeToggle: document.getElementById('theme-toggle')
};

// State Variables for Creator/Modal
let isCreatorPinned = false;
let isModalPinned = false;
let editingNoteId = null;

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
      elements.modalBodyText.focus();
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
          if (confirm("Permanently delete this note? This cannot be undone.")) {
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
    elements.emptyStateTitle.textContent = "No notes here yet";
    elements.emptyStateDesc.textContent = "Your encrypted thoughts will appear here.";
  } else if (activeCategory === 'archive') {
    elements.emptyStateTitle.textContent = "Archive is empty";
    elements.emptyStateDesc.textContent = "Archived notes are kept safe here.";
  } else if (activeCategory === 'trash') {
    elements.emptyStateTitle.textContent = "Trash is empty";
    elements.emptyStateDesc.textContent = "Notes in trash are stored here.";
  } else if (activeCategory.startsWith('tag:')) {
    const tag = activeCategory.substring(4);
    elements.emptyStateTitle.textContent = `No notes with #${tag}`;
    elements.emptyStateDesc.textContent = "Add this tag to your notes to view them here.";
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
      elements.emptyStateTitle.textContent = "No results found";
      elements.emptyStateDesc.textContent = "We couldn't find any notes matching your search.";
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

    // Cover image check
    let coverHtml = '';
    if (note.images && note.images.length > 0) {
      coverHtml = `
        <div class="note-card-image">
          <img src="${note.images[0]}" alt="Cover image">
        </div>
      `;
    }

    card.innerHTML = `
      ${coverHtml}
      <button class="btn-icon note-card-pin ${note.isPinned ? 'active' : ''}" title="${note.isPinned ? 'Unpin note' : 'Pin note'}">
        <i data-lucide="pin"></i>
      </button>
      ${note.title ? `<h3 class="note-card-title">${escapeHtml(note.title)}</h3>` : ''}
      ${note.body ? `<div class="note-card-body ${isTruncated ? 'truncated' : ''}">${escapeHtml(bodyText)}</div>` : ''}
      ${tagsHtml}
      <div class="note-card-footer">
        <span>${formatDate(note.updatedAt)}</span>
      </div>
    `;

    // Click Card to Open Modal (Avoid triggering on Pin click)
    card.addEventListener('click', (e) => {
      const pinBtn = card.querySelector('.note-card-pin');
      if (pinBtn && (e.target === pinBtn || pinBtn.contains(e.target))) {
        e.stopPropagation();
        toggleNotePin(note.id);
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
    elements.sidebarTagsList.innerHTML = `<li class="sidebar-help-text" style="padding: 8px 12px; font-size: 0.8rem; color: var(--text-secondary);">No tags created</li>`;
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
  elements.modalLastEdited.textContent = `Edited ${formatDate(note.updatedAt)}`;
  
  // Trash/Archive labels depending on state
  elements.btnModalArchive.innerHTML = note.isArchived ? '<i data-lucide="folder-up"></i>' : '<i data-lucide="archive"></i>';
  elements.btnModalArchive.title = note.isArchived ? 'Unarchive' : 'Archive';
  
  elements.btnModalTrash.innerHTML = note.isTrashed ? '<i data-lucide="rotate-ccw"></i>' : '<i data-lucide="trash-2"></i>';
  elements.btnModalTrash.title = note.isTrashed ? 'Restore note' : 'Delete note';
  elements.btnModalTrash.className = note.isTrashed ? 'btn-icon text-green' : 'btn-icon';

  elements.noteModal.classList.add('active');
  lucide.createIcons();
  
  // Focus main content body
  setTimeout(() => elements.modalBodyText.focus(), 100);
}

async function saveAndCloseModal() {
  if (!editingNoteId) return;

  const note = decryptedNotes.find(n => n.id === editingNoteId);
  if (note) {
    const titleVal = elements.modalTitle.value.trim();
    const bodyVal = elements.modalBodyText.value.trim();
    
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
  const badge = elements.syncStatus;
  badge.className = `sync-badge ${status}`;
  
  let icon = 'cloud-off';
  let text = 'Offline';
  
  if (status === 'syncing') {
    icon = 'refresh-cw';
    text = 'Syncing';
  } else if (status === 'online') {
    icon = 'cloud-lightning';
    text = 'Sync OK';
  } else if (status === 'error') {
    icon = 'cloud-alert';
    text = 'Sync Error';
  }
  
  badge.innerHTML = `
    <i data-lucide="${icon}"></i>
    <span class="sync-text">${text}</span>
  `;
  badge.title = `Sync Status: ${text}`;
  lucide.createIcons();
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

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // check if this year
  const isThisYear = date.getFullYear() === now.getFullYear();
  if (isThisYear) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
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
  if (!container) return;
  
  container.innerHTML = '';
  if (noteCreatorImages.length === 0) {
    container.classList.add('hidden');
    return;
  }
  
  container.classList.remove('hidden');
  noteCreatorImages.forEach((imgSrc, index) => {
    const item = document.createElement('div');
    item.className = 'preview-image-item';
    item.innerHTML = `
      <img src="${imgSrc}" alt="Attached image preview">
      <button class="btn-remove-image" data-index="${index}" title="Remove image">
        <i data-lucide="x"></i>
      </button>
    `;
    item.querySelector('.btn-remove-image').addEventListener('click', (e) => {
      e.stopPropagation();
      noteCreatorImages.splice(index, 1);
      renderCreatorImages();
    });
    container.appendChild(item);
  });
  lucide.createIcons();
}

function renderModalImages() {
  const container = elements.modalImagesPreview;
  if (!container) return;
  
  container.innerHTML = '';
  if (noteModalImages.length === 0) {
    container.classList.add('hidden');
    return;
  }
  
  container.classList.remove('hidden');
  noteModalImages.forEach((imgSrc, index) => {
    const item = document.createElement('div');
    item.className = 'preview-image-item';
    item.innerHTML = `
      <img src="${imgSrc}" alt="Attached image preview">
      <button class="btn-remove-image" data-index="${index}" title="Remove image">
        <i data-lucide="x"></i>
      </button>
    `;
    item.querySelector('.btn-remove-image').addEventListener('click', (e) => {
      e.stopPropagation();
      noteModalImages.splice(index, 1);
      renderModalImages();
    });
    container.appendChild(item);
  });
  lucide.createIcons();
}
