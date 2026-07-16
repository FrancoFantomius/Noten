/**
 * Noten UI - Shared State and DOM Elements Mapping
 */

// Global State
export const state = {
  activeCategory: 'notes',
  decryptedNotes: [],       // Cache of all decrypted notes in memory
  noteCreatorTags: [],      // Current tags in the note creator
  noteModalTags: [],        // Current tags in the edit modal
  noteCreatorImages: [],    // Current image attachments in creator
  noteModalImages: [],      // Current image attachments in modal
  activeColor: 'default',   // Color chosen in creator
  modalActiveColor: 'default',
  currentSyncStatus: 'offline',
  isCreatorPinned: false,
  isModalPinned: false,
  editingNoteId: null,
  isModalChecklistMode: false,
  isCreatorChecklistMode: false,

  // Controller callbacks
  onSaveNoteCallback: null,
  onDeleteNoteCallback: null,
  onOpenSettingsCallback: null,
  onSignoutCallback: null,
  onPurgeCallback: null
};

// DOM Elements references (initially null, resolved during initElements)
export const elements = {
  appContainer: null,

  // Header
  btnSidebarToggle: null,
  sidebar: null,
  sidebarOverlay: null,
  btnSidebarCloseMobile: null,
  searchInput: null,
  btnSearchClear: null,
  syncStatus: null,
  btnSettingsOpen: null,

  // Navigation items
  navItems: null,
  sidebarTagsList: null,

  // Note Creator
  noteCreator: null,
  creatorCollapsed: null,
  creatorExpanded: null,
  creatorTitle: null,
  creatorBody: null,
  creatorTagsList: null,
  creatorTagInput: null,
  btnCreatorPin: null,
  btnCreatorArchive: null,
  btnCreatorClose: null,
  btnQuickTodo: null,
  btnQuickImage: null,
  btnCreatorChecklistToggle: null,
  btnCreatorTrash: null,
  creatorChecklistView: null,
  btnCreatorImage: null,
  creatorImageInput: null,
  creatorImagesPreview: null,

  // Feeds
  notesViewContent: null,
  pinnedSection: null,
  pinnedGrid: null,
  notesSection: null,
  sectionTitleFeed: null,
  notesGrid: null,
  emptyState: null,
  emptyStateTitle: null,
  emptyStateDesc: null,

  // Note Editor Modal
  noteModal: null,
  modalCard: null,
  modalTitle: null,
  modalBodyText: null,
  modalTagsList: null,
  modalTagInput: null,
  btnModalBack: null,
  btnModalPin: null,
  btnModalArchive: null,
  btnModalTrash: null,
  btnModalDeleteForever: null,
  modalColorPickerWrapper: null,
  btnModalClose: null,
  modalLastEdited: null,
  btnModalImage: null,
  modalImageInput: null,
  modalImagesPreview: null,
  modalChecklistView: null,
  modalBody: null,
  btnModalChecklistToggle: null,

  // Settings Modal
  settingsModal: null,
  btnSettingsClose: null,
  themeToggle: null,

  // Lightbox Modal
  lightboxModal: null,
  lightboxImage: null,
  btnLightboxClose: null,

  // Floating Action Button
  btnFabCreate: null,

  // Account Dropdown Elements
  btnSyncLogin: null,
  btnSyncProfile: null,
  headerProfileAvatar: null,
  headerProfileLetter: null,
  headerProfileIcon: null,

  accountDropdown: null,
  dropdownEmail: null,
  dropdownAvatar: null,
  dropdownLetter: null,
  dropdownIcon: null,
  dropdownUsername: null,

  btnDropdownSettings: null,
  btnDropdownSignout: null,
  btnDropdownPurge: null,

  // Dedicated Login Modal
  loginModal: null,
  btnLoginClose: null,
  btnLoginCancel: null
};

/**
 * Resolves DOM references once the DOM is loaded
 */
export function initElements() {
  elements.appContainer = document.getElementById('app-container');

  // Header
  elements.btnSidebarToggle = document.getElementById('btn-sidebar-toggle');
  elements.sidebar = document.getElementById('app-sidebar');
  elements.sidebarOverlay = document.getElementById('sidebar-overlay');
  elements.btnSidebarCloseMobile = document.getElementById('btn-sidebar-close-mobile');
  elements.searchInput = document.getElementById('search-input');
  elements.btnSearchClear = document.getElementById('btn-search-clear');
  elements.syncStatus = document.getElementById('sync-status');
  elements.btnSettingsOpen = document.getElementById('btn-settings-open');

  // Navigation items
  elements.navItems = document.querySelectorAll('.nav-item');
  elements.sidebarTagsList = document.getElementById('sidebar-tags-list');

  // Note Creator
  elements.noteCreator = document.getElementById('note-creator');
  elements.creatorCollapsed = document.getElementById('creator-collapsed');
  elements.creatorExpanded = document.getElementById('creator-expanded');
  elements.creatorTitle = document.getElementById('creator-title');
  elements.creatorBody = document.getElementById('creator-body');
  elements.creatorTagsList = document.getElementById('creator-tags-list');
  elements.creatorTagInput = document.getElementById('creator-tag-input');
  elements.btnCreatorPin = document.getElementById('btn-creator-pin');
  elements.btnCreatorArchive = document.getElementById('btn-creator-archive');
  elements.btnCreatorClose = document.getElementById('btn-creator-close');
  elements.btnQuickTodo = document.getElementById('btn-quick-todo');
  elements.btnQuickImage = document.getElementById('btn-quick-image');
  elements.btnCreatorChecklistToggle = document.getElementById('btn-creator-checklist-toggle');
  elements.btnCreatorTrash = document.getElementById('btn-creator-trash');
  elements.creatorChecklistView = document.getElementById('creator-checklist-view');
  elements.btnCreatorImage = document.getElementById('btn-creator-image');
  elements.creatorImageInput = document.getElementById('creator-image-input');
  elements.creatorImagesPreview = document.getElementById('creator-images-preview');

  // Feeds
  elements.notesViewContent = document.getElementById('notes-view-content');
  elements.pinnedSection = document.getElementById('pinned-section');
  elements.pinnedGrid = document.getElementById('pinned-grid');
  elements.notesSection = document.getElementById('notes-section');
  elements.sectionTitleFeed = document.getElementById('section-title-feed');
  elements.notesGrid = document.getElementById('notes-grid');
  elements.emptyState = document.getElementById('empty-state');
  elements.emptyStateTitle = document.getElementById('empty-state-title');
  elements.emptyStateDesc = document.getElementById('empty-state-desc');

  // Note Editor Modal
  elements.noteModal = document.getElementById('note-modal');
  elements.modalCard = document.getElementById('modal-card-element');
  elements.modalTitle = document.getElementById('modal-title');
  elements.modalBodyText = document.getElementById('modal-body-text');
  elements.modalTagsList = document.getElementById('modal-tags-list');
  elements.modalTagInput = document.getElementById('modal-tag-input');
  elements.btnModalBack = document.getElementById('btn-modal-back');
  elements.btnModalPin = document.getElementById('btn-modal-pin');
  elements.btnModalArchive = document.getElementById('btn-modal-archive');
  elements.btnModalTrash = document.getElementById('btn-modal-trash');
  elements.btnModalDeleteForever = document.getElementById('btn-modal-delete-forever');
  elements.modalColorPickerWrapper = document.querySelector('#note-modal .color-picker-wrapper');
  elements.btnModalClose = document.getElementById('btn-modal-close');
  elements.modalLastEdited = document.getElementById('modal-last-edited');
  elements.btnModalImage = document.getElementById('btn-modal-image');
  elements.modalImageInput = document.getElementById('modal-image-input');
  elements.modalImagesPreview = document.getElementById('modal-images-preview');
  elements.modalChecklistView = document.getElementById('modal-checklist-view');
  elements.modalBody = document.querySelector('#note-modal .modal-body');
  elements.btnModalChecklistToggle = document.getElementById('btn-modal-checklist-toggle');

  // Settings Modal
  elements.settingsModal = document.getElementById('settings-modal');
  elements.btnSettingsClose = document.getElementById('btn-settings-close');
  elements.themeToggle = document.getElementById('theme-toggle');

  // Lightbox Modal
  elements.lightboxModal = document.getElementById('lightbox-modal');
  elements.lightboxImage = document.getElementById('lightbox-image');
  elements.btnLightboxClose = document.getElementById('btn-lightbox-close');

  // Floating Action Button
  elements.btnFabCreate = document.getElementById('btn-fab-create');

  // Account Dropdown Elements
  elements.btnSyncLogin = document.getElementById('btn-sync-login');
  elements.btnSyncProfile = document.getElementById('btn-sync-profile');
  elements.headerProfileAvatar = document.getElementById('header-profile-avatar');
  elements.headerProfileLetter = document.getElementById('header-profile-letter');
  elements.headerProfileIcon = document.getElementById('header-profile-icon');

  elements.accountDropdown = document.getElementById('account-dropdown');
  elements.dropdownEmail = document.getElementById('account-dropdown-email');
  elements.dropdownAvatar = document.getElementById('dropdown-profile-avatar');
  elements.dropdownLetter = document.getElementById('dropdown-profile-letter');
  elements.dropdownIcon = document.getElementById('dropdown-profile-icon');
  elements.dropdownUsername = document.getElementById('dropdown-profile-username');

  elements.btnDropdownSettings = document.getElementById('btn-dropdown-settings');
  elements.btnDropdownSignout = document.getElementById('btn-dropdown-signout');
  elements.btnDropdownPurge = document.getElementById('btn-dropdown-purge');

  // Dedicated Login Modal
  elements.loginModal = document.getElementById('login-modal');
  elements.btnLoginClose = document.getElementById('btn-login-close');
  elements.btnLoginCancel = document.getElementById('btn-login-cancel');
}
