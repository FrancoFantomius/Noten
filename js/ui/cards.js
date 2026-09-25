/**
 * Noten UI - Feed Cards and Sidebar Navigation
 */

import { t } from '../i18n.js';
import { state, elements } from './state.js';
import { escapeHtml, formatDate, openLightbox, setupCarouselItemClicks, getImageSrc, showDeleteConfirmDialog } from './utils.js';
import { renderTextWithLinks } from './link-utils.js';
import { hasChecklistItems, buildChecklistDOM } from './checklist.js';
import { openNoteModal, saveAndCloseModal } from './modal.js';
import { showSettings, hideSettings } from './account.js';

/**
 * Initializes sidebar toggling, search input listeners, sidebar navigations, and hash change event listeners
 */
export function initCardsUI() {
  fixSidebarSpacing();
  initInfiniteScroll();

  // Restore saved sidebar collapsed state across page navigations
  try {
    const isSavedCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    if (isSavedCollapsed && window.innerWidth > 768 && elements.sidebar) {
      elements.sidebar.classList.add('collapsed');
    }
  } catch (e) {}
  document.documentElement.classList.remove('sidebar-collapsed-preload');

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
      if (category) {
        e.preventDefault();
        navigateToCategory(category);
      }
    });
  });

  if (elements.sidebarRail) {
    elements.sidebarRail.addEventListener('change', (e) => {
      const val = e.detail?.value || e.detail?.item?.getAttribute('data-category');
      if (val && (val === 'notes' || val === 'archive' || val === 'trash')) {
        navigateToCategory(val);
      }
    });
  }

  if (elements.navigationBar) {
    elements.navigationBar.addEventListener('change', (e) => {
      const val = e.detail?.value || e.detail?.item?.getAttribute('data-category') || e.detail?.item?.value;
      if (val && (val === 'notes' || val === 'archive' || val === 'trash')) {
        navigateToCategory(val);
      }
    });
  }

  // Initial category sync across drawer and rail
  setCategory(state.activeCategory);

  // Search Live Filtering & Suggestions
  if (elements.searchInput) {
    const handleSearch = () => {
      renderNotesFeed();
      updateSearchSuggestionsAndTags();
    };
    elements.searchInput.addEventListener('input', handleSearch);
    elements.searchInput.addEventListener('search', handleSearch);
    elements.searchInput.addEventListener('clear', handleSearch);
    elements.searchInput.addEventListener('active-change', () => {
      updateSearchSuggestionsAndTags();
    });
    elements.searchInput.addEventListener('suggestion-select', (e) => {
      const suggestion = e.detail?.suggestion;
      if (suggestion && suggestion.id) {
        openNoteModal(suggestion.id);
      }
    });
  }

  if (elements.btnSearchClear) {
    elements.btnSearchClear.addEventListener('click', () => {
      if (elements.searchInput) elements.searchInput.value = '';
      renderNotesFeed();
      updateSearchSuggestionsAndTags();
    });
  }

  // Window popstate listener for SPA browser history navigation
  window.addEventListener('popstate', () => {
    const currentPath = window.location.pathname;
    const hash = window.location.hash;

    let targetCategory = 'notes';
    if (currentPath.endsWith('archive.html')) {
      targetCategory = 'archive';
    } else if (currentPath.endsWith('trash.html')) {
      targetCategory = 'trash';
    } else if (hash.startsWith('#tag-')) {
      const raw = decodeURIComponent(hash.substring(5));
      const tags = raw.split(/[,+]/).map(t => t.trim()).filter(Boolean);
      targetCategory = tags.length > 0 ? `tag:${tags.join(',')}` : 'notes';
    }

    setCategory(targetCategory);
  });

  // Window hashchange listener for browser history navigation
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash;

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

    if (hash.startsWith('#tag-')) {
      const raw = decodeURIComponent(hash.substring(5));
      const tags = raw.split(/[,+]/).map(t => t.trim()).filter(Boolean);
      const targetCat = tags.length > 0 ? `tag:${tags.join(',')}` : 'notes';
      setCategory(targetCat);
    } else if (!hash || hash === '#') {
      if (state.activeCategory.startsWith('tag:') || state.selectedTags.length > 0) {
        const currentPath = window.location.pathname;
        if (currentPath.endsWith('archive.html')) {
          setCategory('archive');
        } else if (currentPath.endsWith('trash.html')) {
          setCategory('trash');
        } else {
          setCategory('notes');
        }
      }
    }
  });
}

/**
 * Removes extraneous top spacing inside md-navigation-drawer and md-navigation-rail
 */
export function fixSidebarSpacing() {
  const applyFixes = () => {
    if (elements.sidebarDrawer && elements.sidebarDrawer.shadowRoot) {
      if (!elements.sidebarDrawer.shadowRoot.getElementById('drawer-spacing-fix')) {
        const style = document.createElement('style');
        style.id = 'drawer-spacing-fix';
        style.textContent = `
          .header {
            padding: 0 !important;
            display: none !important;
          }
          .content {
            padding-top: 8px !important;
          }
        `;
        elements.sidebarDrawer.shadowRoot.appendChild(style);
      }
    }

    if (elements.sidebarRail && elements.sidebarRail.shadowRoot) {
      if (!elements.sidebarRail.shadowRoot.getElementById('rail-spacing-fix')) {
        const style = document.createElement('style');
        style.id = 'rail-spacing-fix';
        style.textContent = `
          .header {
            margin-bottom: 0 !important;
            display: none !important;
          }
          .rail {
            padding-top: 8px !important;
          }
        `;
        elements.sidebarRail.shadowRoot.appendChild(style);
      }
    }
  };

  applyFixes();
  customElements.whenDefined('md-navigation-drawer').then(applyFixes);
  customElements.whenDefined('md-navigation-rail').then(applyFixes);
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
    const isCollapsed = elements.sidebar.classList.toggle('collapsed');
    try {
      localStorage.setItem('sidebar_collapsed', isCollapsed ? 'true' : 'false');
    } catch (e) {}
  }
}

/**
 * Computes target HTML URL for a given category maintaining the current basePath
 */
export function getCategoryUrl(category) {
  const currentPath = window.location.pathname;
  const lastSlashIndex = currentPath.lastIndexOf('/');
  const basePath = lastSlashIndex >= 0 ? currentPath.substring(0, lastSlashIndex + 1) : '';
  const pageName = category === 'notes' ? 'index.html' : `${category}.html`;
  return basePath ? `${basePath}${pageName}` : pageName;
}

/**
 * Navigates to a category smoothly without a full page reload (SPA navigation)
 */
export function navigateToCategory(category) {
  if (!category) return;
  state.selectedTags = [];
  const targetUrl = getCategoryUrl(category);
  const currentUrl = window.location.pathname + window.location.search + window.location.hash;
  if (currentUrl !== targetUrl) {
    history.pushState({ category }, '', targetUrl);
  }
  setCategory(category);
}

/**
 * Toggles a tag filter on or off (supports multiple tag selection and deselection)
 * @param {string} tag
 */
export function toggleTagFilter(tag) {
  if (!tag) return;
  const tagLower = tag.toLowerCase().trim();
  let currentTags = [...state.selectedTags];
  const idx = currentTags.findIndex(t => t.toLowerCase().trim() === tagLower);

  if (idx >= 0) {
    // Deselect tag if pressed again
    currentTags.splice(idx, 1);
  } else {
    // Select tag
    currentTags.push(tag.trim());
  }

  if (currentTags.length > 0) {
    const newCategory = `tag:${currentTags.join(',')}`;
    const tagHash = `#tag-${currentTags.map(t => encodeURIComponent(t)).join(',')}`;
    const currentPath = window.location.pathname;
    const isNotesPage = !currentPath.endsWith('archive.html') && !currentPath.endsWith('trash.html');

    if (isNotesPage) {
      const targetUrl = `${getCategoryUrl('notes')}${tagHash}`;
      const currentUrl = window.location.pathname + window.location.search + window.location.hash;
      if (currentUrl !== targetUrl) {
        history.pushState({ category: newCategory }, '', targetUrl);
      }
      setCategory(newCategory);
    } else {
      window.location.href = `index.html${tagHash}`;
    }
  } else {
    // All tags deselected -> switch back to base category (notes, archive, or trash)
    const currentPath = window.location.pathname;
    let baseCategory = 'notes';
    if (currentPath.endsWith('archive.html')) {
      baseCategory = 'archive';
    } else if (currentPath.endsWith('trash.html')) {
      baseCategory = 'trash';
    }
    const targetUrl = getCategoryUrl(baseCategory);
    const currentUrl = window.location.pathname + window.location.search + window.location.hash;
    if (currentUrl !== targetUrl) {
      history.pushState({ category: baseCategory }, '', targetUrl);
    }
    setCategory(baseCategory);
  }
}

/**
 * Switch active categories
 */
export function setCategory(category) {
  state.activeCategory = category;

  if (category.startsWith('tag:')) {
    const raw = category.substring(4);
    state.selectedTags = raw.split(/[,+]/).map(t => t.trim()).filter(Boolean);
  } else {
    state.selectedTags = [];
  }

  // Close mobile sidebar on select
  if (elements.sidebar) {
    elements.sidebar.classList.remove('mobile-open');
  }
  if (elements.sidebarOverlay) {
    elements.sidebarOverlay.classList.remove('active');
  }

  const categoryToIndex = {
    'notes': 0,
    'archive': 1,
    'trash': 2
  };

  // Sync md-navigation-rail activeIndex
  if (elements.sidebarRail) {
    if (category in categoryToIndex) {
      const idx = categoryToIndex[category];
      elements.sidebarRail.activeIndex = idx;
      elements.sidebarRail.setAttribute('active-index', String(idx));
    } else {
      elements.sidebarRail.activeIndex = -1;
      elements.sidebarRail.removeAttribute('active-index');
    }
  }

  // Sync md-navigation-bar activeIndex & value
  if (elements.navigationBar) {
    if (category in categoryToIndex) {
      const idx = categoryToIndex[category];
      elements.navigationBar.activeIndex = idx;
      elements.navigationBar.setAttribute('active-index', String(idx));
      elements.navigationBar.value = category;
    } else {
      elements.navigationBar.activeIndex = -1;
      elements.navigationBar.removeAttribute('active-index');
      elements.navigationBar.value = '';
    }
  }

  // Update body page classes for dynamic styling (e.g. hiding creator/FAB on archive & trash)
  if (document.body) {
    document.body.classList.toggle('archive-page', category === 'archive');
    document.body.classList.toggle('trash-page', category === 'trash');
    document.body.classList.toggle('index-page', category === 'notes' || category.startsWith('tag:'));
  }

  // Highlight all sidebar items across both drawer and rail
  elements.navItems.forEach(i => {
    const dataCat = i.getAttribute('data-category');
    const isMatch = category === dataCat;
    i.classList.toggle('active', isMatch);
    if (isMatch) {
      i.setAttribute('active', '');
      i.setAttribute('selected', '');
      if ('active' in i) i.active = true;
      if ('selected' in i) i.selected = true;
    } else {
      i.removeAttribute('active');
      i.removeAttribute('selected');
      if ('active' in i) i.active = false;
      if ('selected' in i) i.selected = false;
    }
  });

  // Re-render sidebar tags so all chips reflect the latest selectedTags accurately
  renderSidebarTags();

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

  if (state.activeCategory === 'notes' && state.selectedTags.length === 0) {
    elements.emptyStateTitle.textContent = t('empty_state_notes_title');
    elements.emptyStateDesc.textContent = t('empty_state_notes_desc');
  } else if (state.activeCategory === 'archive') {
    elements.emptyStateTitle.textContent = t('empty_state_archive_title');
    elements.emptyStateDesc.textContent = t('empty_state_archive_desc');
  } else if (state.activeCategory === 'trash') {
    elements.emptyStateTitle.textContent = t('empty_state_trash_title');
    elements.emptyStateDesc.textContent = t('empty_state_trash_desc');
  } else if (state.activeCategory.startsWith('tag:') || state.selectedTags.length > 0) {
    const tagDisplay = state.selectedTags.join(', #');
    elements.emptyStateTitle.textContent = t('empty_state_tags_title', { tag: tagDisplay });
    elements.emptyStateDesc.textContent = t('empty_state_tags_desc');
  }
}

// Infinite scrolling / Chunk pagination state
const PAGE_SIZE = 10;
let visibleNotesLimit = PAGE_SIZE;
let currentFilteredNotes = [];
let currentPinnedNotes = [];
let currentUnpinnedNotes = [];
let currentShowPinnedSection = false;
let isLoadingMore = false;
let feedObserver = null;
let infiniteScrollInitialized = false;

/**
 * Gets or creates the bottom sentinel DOM element used for infinite scroll
 */
function getOrCreateSentinel() {
  let sentinel = document.getElementById('infinite-scroll-sentinel');
  if (!sentinel) {
    sentinel = document.createElement('div');
    sentinel.id = 'infinite-scroll-sentinel';
    sentinel.className = 'infinite-scroll-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    const container = elements.notesViewContent || elements.contentPanel || document.querySelector('.content-panel');
    if (container) {
      container.appendChild(sentinel);
    }
  }
  return sentinel;
}

/**
 * Checks if the sentinel is in/near the viewport and loads more notes if needed
 */
function checkSentinelNearBottom() {
  if (!currentFilteredNotes || visibleNotesLimit >= currentFilteredNotes.length) return;
  const sentinel = getOrCreateSentinel();
  if (sentinel) {
    const rect = sentinel.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top <= viewportHeight + 300) {
      loadMoreNotes();
    }
  }
}

/**
 * Loads the next batch of 10 notes when the user scrolls near the bottom
 */
export function loadMoreNotes() {
  if (isLoadingMore) return;
  if (!currentFilteredNotes || visibleNotesLimit >= currentFilteredNotes.length) return;

  isLoadingMore = true;

  const previousLimit = visibleNotesLimit;
  visibleNotesLimit += PAGE_SIZE;

  if (currentShowPinnedSection) {
    const oldPinnedCount = Math.min(currentPinnedNotes.length, previousLimit);
    const newPinnedCount = Math.min(currentPinnedNotes.length, visibleNotesLimit);
    if (newPinnedCount > oldPinnedCount) {
      const nextPinned = currentPinnedNotes.slice(oldPinnedCount, newPinnedCount);
      renderCardsToGrid(nextPinned, elements.pinnedGrid, true);
    }

    const oldUnpinnedCount = Math.min(currentUnpinnedNotes.length, Math.max(0, previousLimit - currentPinnedNotes.length));
    const newUnpinnedCount = Math.min(currentUnpinnedNotes.length, Math.max(0, visibleNotesLimit - currentPinnedNotes.length));
    if (newUnpinnedCount > oldUnpinnedCount) {
      if (oldUnpinnedCount === 0 && elements.sectionTitleFeed) {
        elements.sectionTitleFeed.classList.remove('hidden');
      }
      const nextUnpinned = currentUnpinnedNotes.slice(oldUnpinnedCount, newUnpinnedCount);
      renderCardsToGrid(nextUnpinned, elements.notesGrid, true);
    }
  } else {
    const nextNotes = currentFilteredNotes.slice(previousLimit, Math.min(currentFilteredNotes.length, visibleNotesLimit));
    renderCardsToGrid(nextNotes, elements.notesGrid, true);
  }

  isLoadingMore = false;

  if (visibleNotesLimit < currentFilteredNotes.length) {
    requestAnimationFrame(checkSentinelNearBottom);
  }
}

/**
 * Initializes IntersectionObserver and scroll listeners for infinite scrolling
 */
export function initInfiniteScroll() {
  if (infiniteScrollInitialized) return;
  infiniteScrollInitialized = true;

  const sentinel = getOrCreateSentinel();
  if ('IntersectionObserver' in window) {
    if (feedObserver) {
      feedObserver.disconnect();
    }
    feedObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadMoreNotes();
        }
      });
    }, {
      root: null,
      rootMargin: '300px',
      threshold: 0
    });

    if (sentinel) {
      feedObserver.observe(sentinel);
    }
  }

  let isScrollTicking = false;
  const handleScroll = () => {
    if (!isScrollTicking) {
      window.requestAnimationFrame(() => {
        checkSentinelNearBottom();
        isScrollTicking = false;
      });
      isScrollTicking = true;
    }
  };

  if (elements.contentPanel) {
    elements.contentPanel.addEventListener('scroll', handleScroll, { passive: true });
  }
  window.addEventListener('scroll', handleScroll, { passive: true });
}

/**
 * Filter and render note grid cards
 * @param {Object} [options]
 * @param {boolean} [options.preserveCount=false] If true, retains the currently loaded batch size
 */
export function renderNotesFeed(options = {}) {
  const { preserveCount = false } = typeof options === 'object' && options !== null ? options : {};
  if (!preserveCount) {
    visibleNotesLimit = PAGE_SIZE;
  }

  const searchQuery = elements.searchInput ? elements.searchInput.value.trim().toLowerCase() : '';

  // Filter notes by category, tags, and search
  const filtered = state.decryptedNotes.filter(note => {
    const noteTagsLower = Array.isArray(note.tags)
      ? note.tags.map(t => (typeof t === 'string' ? t.toLowerCase().trim() : '')).filter(Boolean)
      : [];

    // Tag filter matching: Note MUST contain ALL selected tags
    if (state.selectedTags.length > 0) {
      const hasAllSelectedTags = state.selectedTags.every(targetTag =>
        noteTagsLower.includes(targetTag.toLowerCase().trim())
      );
      if (!hasAllSelectedTags) return false;
    }

    // 1. Category/Search Filter
    if (searchQuery) {
      if (note.isTrashed) return false;
    } else {
      if (state.selectedTags.length > 0 || state.activeCategory.startsWith('tag:')) {
        if (state.tagFilterIncludeArchived) {
          if (note.isTrashed) return false;
        } else {
          if (note.isArchived || note.isTrashed) return false;
        }
      } else if (state.activeCategory === 'notes') {
        if (note.isArchived || note.isTrashed) return false;
      } else if (state.activeCategory === 'archive') {
        if (!note.isArchived || note.isTrashed) return false;
      } else if (state.activeCategory === 'trash') {
        if (!note.isTrashed) return false;
      }
    }

    // 2. Search Query Matching (support #tags and text terms)
    if (searchQuery) {
      const tokens = searchQuery.split(/\s+/).filter(Boolean);
      const tagTokens = tokens.filter(t => t.startsWith('#')).map(t => t.substring(1).toLowerCase());
      const textTokens = tokens.filter(t => !t.startsWith('#'));

      // All #tag tokens must match note tags
      if (tagTokens.length > 0) {
        const hasAllTags = tagTokens.every(tag => noteTagsLower.includes(tag));
        if (!hasAllTags) return false;
      }

      // All text tokens must match title, body, or tags
      if (textTokens.length > 0) {
        const matchTitle = (note.title || '').toLowerCase();
        const matchBody = (note.body || '').toLowerCase();
        return textTokens.every(term =>
          matchTitle.includes(term) ||
          matchBody.includes(term) ||
          noteTagsLower.some(t => t.includes(term))
        );
      }

      return true;
    }

    return true;
  });

  // Sort notes by updatedAt desc
  filtered.sort((a, b) => b.updatedAt - a.updatedAt);

  // Group into Pinned and Unpinned
  const pinned = filtered.filter(n => n.isPinned);
  const unpinned = filtered.filter(n => !n.isPinned);

  // Show pinned section only if there are pinned notes, we are in 'notes' category, and NOT searching/tag-filtering
  const showPinnedSection = pinned.length > 0 && state.activeCategory === 'notes' && !searchQuery && state.selectedTags.length === 0;

  currentFilteredNotes = filtered;
  currentPinnedNotes = pinned;
  currentUnpinnedNotes = unpinned;
  currentShowPinnedSection = showPinnedSection;

  // Clear card tooltips container on fresh render
  const cardTooltipsContainer = document.getElementById('card-tooltips-container');
  if (cardTooltipsContainer) cardTooltipsContainer.innerHTML = '';

  // Render Pinned Section
  if (showPinnedSection) {
    if (elements.pinnedSection) elements.pinnedSection.classList.remove('hidden');
    const pinnedToRender = pinned.slice(0, visibleNotesLimit);
    renderCardsToGrid(pinnedToRender, elements.pinnedGrid, false);
  } else {
    if (elements.pinnedSection) elements.pinnedSection.classList.add('hidden');
    if (elements.pinnedGrid) elements.pinnedGrid.innerHTML = '';
  }

  // Render Unpinned Section (or all notes if pinned section is hidden)
  if (showPinnedSection) {
    const unpinnedLimit = Math.max(0, visibleNotesLimit - pinned.length);
    const unpinnedToRender = unpinned.slice(0, unpinnedLimit);
    if (unpinnedToRender.length > 0) {
      renderCardsToGrid(unpinnedToRender, elements.notesGrid, false);
      if (elements.sectionTitleFeed) elements.sectionTitleFeed.classList.remove('hidden');
    } else {
      if (elements.notesGrid) elements.notesGrid.innerHTML = '';
      if (elements.sectionTitleFeed) elements.sectionTitleFeed.classList.add('hidden');
    }
  } else {
    const mainGridNotes = filtered.slice(0, visibleNotesLimit);
    if (mainGridNotes.length > 0) {
      renderCardsToGrid(mainGridNotes, elements.notesGrid, false);
    } else {
      if (elements.notesGrid) elements.notesGrid.innerHTML = '';
    }
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

  // Ensure sentinel is present and re-observed
  const sentinel = getOrCreateSentinel();
  if (feedObserver && sentinel) {
    feedObserver.unobserve(sentinel);
    feedObserver.observe(sentinel);
  }

  // If initial batch doesn't fill the viewport, schedule check to load more
  requestAnimationFrame(checkSentinelNearBottom);
}

export function renderCardsToGrid(notes, gridElement, append = false) {
  if (!gridElement) return;
  if (!append) {
    gridElement.innerHTML = '';
  }
  const cardTooltipsContainer = document.getElementById('card-tooltips-container');

  notes.forEach(note => {
    const card = document.createElement('div');
    card.className = `note-card color-${note.color || 'default'}`;
    card.setAttribute('data-id', note.id);

    const isTruncated = note.body.length > 300;
    const bodyText = isTruncated ? note.body.substring(0, 300) : note.body;

    let tagsHtml = '';
    if (note.tags && note.tags.length > 0) {
      tagsHtml = `
        <md-chip-set class="card-tags">
          ${note.tags.map(t => {
            const isSelected = state.selectedTags.some(st => st.toLowerCase() === (t || '').toLowerCase().trim());
            return `<md-chip label="${escapeHtml(t)}" variant="filter" ${isSelected ? 'selected' : ''}></md-chip>`;
          }).join('')}
        </md-chip-set>
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
      <md-icon-button id="card-pin-${note.id}" class="btn-icon note-card-pin ${note.isPinned ? 'active' : ''}" ${note.isPinned ? 'selected' : ''} icon="keep" aria-label="${note.isPinned ? t('btn_unpin_note_title') : t('btn_pin_note_title')}"></md-icon-button>
      ` : ''}
      ${note.title ? `<h3 class="note-card-title">${escapeHtml(note.title)}</h3>` : ''}
      ${note.body && !isChecklist ? `<div class="note-card-body ${isTruncated ? 'truncated' : ''}">${renderTextWithLinks(bodyText)}</div>` : ''}
      ${tagsHtml}
      <div class="note-card-footer">
        <span>${formatDate(note.updatedAt)}</span>
        ${note.isTrashed ? `
          <div class="note-card-trash-actions">
            <md-icon-button id="card-restore-${note.id}" class="btn-icon btn-card-restore" icon="restore" aria-label="Restore"></md-icon-button>
            <md-icon-button id="card-delete-${note.id}" class="btn-icon btn-card-delete-forever" icon="delete" aria-label="Delete Forever"></md-icon-button>
          </div>
        ` : ''}
      </div>
    `;

    if (cardTooltipsContainer) {
      if (!note.isTrashed) {
        const pinTooltip = document.createElement('md-tooltip');
        pinTooltip.setAttribute('for', `card-pin-${note.id}`);
        pinTooltip.setAttribute('show-delay', '200');
        pinTooltip.textContent = note.isPinned ? t('btn_unpin_note_title') : t('btn_pin_note_title');
        cardTooltipsContainer.appendChild(pinTooltip);
      } else {
        const restoreTooltip = document.createElement('md-tooltip');
        restoreTooltip.setAttribute('for', `card-restore-${note.id}`);
        restoreTooltip.setAttribute('show-delay', '200');
        restoreTooltip.textContent = t('btn_modal_trash_restore_title');
        cardTooltipsContainer.appendChild(restoreTooltip);

        const deleteTooltip = document.createElement('md-tooltip');
        deleteTooltip.setAttribute('for', `card-delete-${note.id}`);
        deleteTooltip.setAttribute('show-delay', '200');
        deleteTooltip.textContent = t('btn_modal_trash_delete_forever_title');
        cardTooltipsContainer.appendChild(deleteTooltip);
      }
    }

    if (note.body && isChecklist) {
      const checklistContainer = buildChecklistDOM(bodyText, note.id, isTruncated, note.isTrashed);
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

    const carousel = card.querySelector('md-carousel');
    if (carousel) {
      setupCarouselItemClicks(carousel, (src, item, name) => {
        const validImages = (note.images || []).filter(img => Boolean(getImageSrc(img)));
        const clickedIndex = validImages.findIndex(img => getImageSrc(img) === src);
        const onDelete = !note.isTrashed ? async (delIndex) => {
          const targetIndex = delIndex !== undefined ? delIndex : clickedIndex;
          if (targetIndex >= 0 && targetIndex < note.images.length) {
            note.images.splice(targetIndex, 1);
            note.updatedAt = Date.now();
            if (state.onSaveNoteCallback) {
              await state.onSaveNoteCallback(note.id, note);
            }
            renderNotesFeed({ preserveCount: true });
          }
        } : null;
        openLightbox(src, name, onDelete, validImages, clickedIndex >= 0 ? clickedIndex : 0);
      });
    }

    card.addEventListener('click', (e) => {
      const path = e.composedPath ? e.composedPath() : [e.target];
      const pinBtn = card.querySelector('.note-card-pin');
      const restoreBtn = card.querySelector('.btn-card-restore');
      const deleteForeverBtn = card.querySelector('.btn-card-delete-forever');
      const linkClick = path.find(el => el && el.tagName === 'A' && el.classList && el.classList.contains('note-link')) || e.target.closest('a.note-link');
      const carouselItem = path.find(el => el && el.tagName === 'MD-CAROUSEL-ITEM') || e.target.closest('md-carousel-item');
      const carouselEl = path.find(el => el && el.tagName === 'MD-CAROUSEL') || e.target.closest('md-carousel');
      const checklistClick = path.find(el => el && el.classList && el.classList.contains('checklist-item')) || e.target.closest('.checklist-item');

      const tagChip = path.find(el => el && el.tagName === 'MD-CHIP' && el.closest('.card-tags')) || e.target.closest('.card-tags md-chip');

      if (linkClick) {
        e.stopPropagation();
      } else if (tagChip) {
        e.stopPropagation();
        const tagLabel = tagChip.getAttribute('label');
        if (tagLabel) {
          toggleTagFilter(tagLabel);
        }
      } else if (pinBtn && (e.target === pinBtn || pinBtn.contains(e.target) || path.includes(pinBtn))) {
        e.stopPropagation();
        toggleNotePin(note.id);
      } else if (restoreBtn && (e.target === restoreBtn || restoreBtn.contains(e.target) || path.includes(restoreBtn))) {
        e.stopPropagation();
        restoreNote(note.id);
      } else if (deleteForeverBtn && (e.target === deleteForeverBtn || deleteForeverBtn.contains(e.target) || path.includes(deleteForeverBtn))) {
        e.stopPropagation();
        deleteNoteForever(note.id);
      } else if (carouselItem) {
        e.stopPropagation();
        const imgEl = carouselItem.querySelector('img');
        const src = carouselItem.getAttribute('src') || carouselItem.src || imgEl?.src || imgEl?.getAttribute('src');
        const name = carouselItem.getAttribute('alt') || carouselItem.getAttribute('name') || imgEl?.getAttribute('alt') || '';
        if (src) {
          const validImages = (note.images || []).filter(img => Boolean(getImageSrc(img)));
          const clickedIndex = validImages.findIndex(img => getImageSrc(img) === src);
          const onDelete = !note.isTrashed ? async (delIndex) => {
            const targetIndex = delIndex !== undefined ? delIndex : clickedIndex;
            if (targetIndex >= 0 && targetIndex < note.images.length) {
              note.images.splice(targetIndex, 1);
              note.updatedAt = Date.now();
              if (state.onSaveNoteCallback) {
                await state.onSaveNoteCallback(note.id, note);
              }
              renderNotesFeed({ preserveCount: true });
            }
          } : null;
          openLightbox(src, name, onDelete, validImages, clickedIndex >= 0 ? clickedIndex : 0);
        }
      } else if (carouselEl) {
        e.stopPropagation();
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
    renderNotesFeed({ preserveCount: true });
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
    renderNotesFeed({ preserveCount: true });
  }
}

export async function deleteNoteForever(noteId) {
  const note = state.decryptedNotes.find(n => n.id === noteId);
  if (note) {
    const confirmed = await showDeleteConfirmDialog();
    if (confirmed) {
      if (state.onDeleteNoteCallback) {
        await state.onDeleteNoteCallback(note.id);
      }
    }
  }
}

/**
 * Generates responsive image carousel HTML string for note cards.
 */
export function generateImageCarouselHtml(images) {
  if (!images || images.length === 0) return '';

  const validImages = images.filter(img => Boolean(getImageSrc(img)));
  if (validImages.length === 0) return '';

  const isSingle = validImages.length === 1;
  const itemsHtml = validImages.map((img, index) => {
    const src = getImageSrc(img);
    return `
    <md-carousel-item interactive>
      <img slot="media" src="${src}" alt="image-${index + 1}.jpg" loading="lazy" />
    </md-carousel-item>
  `;
  }).join('');

  return `
    <md-carousel layout="uncontained" item-height="180px" hide-indicators aria-label="Note images">
      ${itemsHtml}
    </md-carousel>
  `;
}

export const generateImageGridHtml = generateImageCarouselHtml;

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
    elements.sidebarTagsList.innerHTML = `<span class="sidebar-help-text" style="padding: 8px 12px; font-size: 0.8rem; color: var(--text-secondary);">${t('sidebar_no_tags')}</span>`;
    return;
  }

  tags.forEach(tag => {
    const chip = document.createElement('md-chip');
    chip.setAttribute('label', tag);
    chip.setAttribute('icon', 'tag');
    chip.setAttribute('variant', 'filter');
    const isSelected = state.selectedTags.some(t => t.toLowerCase() === tag.toLowerCase());
    if (isSelected) {
      chip.setAttribute('selected', '');
      chip.selected = true;
    }

    chip.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleTagFilter(tag);
    });

    elements.sidebarTagsList.appendChild(chip);
  });
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Update search bar suggestions with matching notes and render filter tags beneath
 */
export function updateSearchSuggestionsAndTags() {
  if (!elements.searchInput) return;

  const searchQuery = elements.searchInput.value ? elements.searchInput.value.trim().toLowerCase() : '';
  const availableNotes = state.decryptedNotes.filter(n => !n.isTrashed);

  const tokens = searchQuery ? searchQuery.split(/\s+/).filter(Boolean) : [];
  const tagTokens = tokens.filter(t => t.startsWith('#')).map(t => t.substring(1).toLowerCase());
  const textTokens = tokens.filter(t => !t.startsWith('#'));

  // 1. Calculate matching notes for suggestions
  let matchingNotes = [];
  if (searchQuery) {
    matchingNotes = availableNotes.filter(note => {
      if (tagTokens.length > 0) {
        const noteTagsLower = (note.tags || []).map(t => t.toLowerCase());
        const hasAllTags = tagTokens.every(tag => noteTagsLower.includes(tag));
        if (!hasAllTags) return false;
      }
      if (textTokens.length > 0) {
        const matchTitle = (note.title || '').toLowerCase();
        const matchBody = (note.body || '').toLowerCase();
        const matchTags = (note.tags || []).map(t => t.toLowerCase());
        return textTokens.every(term =>
          matchTitle.includes(term) ||
          matchBody.includes(term) ||
          matchTags.some(t => t.includes(term))
        );
      }
      return true;
    });
  } else {
    // Show top recent notes when query is empty
    matchingNotes = availableNotes.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // Populate search suggestions (up to 4)
  const topNotes = matchingNotes.slice(0, 4);
  elements.searchInput.suggestions = topNotes.map(note => {
    const rawTitle = (note.title || '').trim();
    let snippet = '';
    if (note.body) {
      snippet = note.body.replace(/\n+/g, ' ').trim().substring(0, 60);
    }
    const label = rawTitle || snippet || t('section_header_notes') || 'Note';

    let trailing = '';
    if (note.tags && note.tags.length > 0) {
      trailing = '#' + note.tags.slice(0, 2).join(' #');
    }

    return {
      id: note.id,
      label: label,
      supportingText: snippet && rawTitle ? snippet : (formatDate(note.updatedAt) || ''),
      trailingSupportingText: trailing,
      icon: note.isPinned ? 'push_pin' : (note.isArchived ? 'archive' : 'description'),
      value: rawTitle || note.id
    };
  });

  // 2. Render tags below suggestions
  const tagsList = document.getElementById('search-tags-list');
  const tagsContainer = document.getElementById('search-tags-container');
  if (tagsList && tagsContainer) {
    const allTags = new Set();
    availableNotes.forEach(n => {
      if (n.tags) n.tags.forEach(t => allTags.add(t));
    });

    const sortedTags = Array.from(allTags).sort();
    if (sortedTags.length === 0) {
      tagsContainer.style.display = 'none';
      tagsList.innerHTML = '';
    } else {
      tagsContainer.style.display = 'flex';
      tagsList.innerHTML = '';

      sortedTags.forEach(tag => {
        const isSelected = tagTokens.includes(tag.toLowerCase());
        const chip = document.createElement('md-chip');
        chip.setAttribute('label', tag);
        chip.setAttribute('icon', 'tag');
        chip.setAttribute('variant', 'filter');
        if (isSelected) {
          chip.setAttribute('selected', '');
          chip.selected = true;
        }

        chip.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleSearchTag(tag);
        });

        tagsList.appendChild(chip);
      });
    }
  }
}

/**
 * Toggle a tag in the search query to narrow results
 */
function toggleSearchTag(tag) {
  if (!elements.searchInput) return;

  const currentVal = elements.searchInput.value ? elements.searchInput.value.trim() : '';
  const tagStr = `#${tag}`;
  const tagRegex = new RegExp(`(^|\\s)#${escapeRegex(tag)}(?=\\s|$)`, 'gi');

  let newVal = '';
  if (tagRegex.test(currentVal)) {
    newVal = currentVal.replace(tagRegex, '').replace(/\s+/g, ' ').trim();
  } else {
    newVal = currentVal ? `${currentVal} ${tagStr}` : tagStr;
  }

  elements.searchInput.value = newVal;

  renderNotesFeed();
  updateSearchSuggestionsAndTags();
  elements.searchInput.focus();
}
