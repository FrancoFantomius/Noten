/**
 * Noten UI - Note Creator Panel
 */

import { t } from '../i18n.js';
import { state, elements } from './state.js';
import { compressImage, renderImageGrid } from './utils.js';
import {
  hasChecklistItems,
  convertTextToChecklist,
  convertChecklistToText,
  renderCreatorChecklist,
  serializeCreatorChecklist
} from './checklist.js';

/**
 * Initializes Note Creator event listeners
 */
export function initCreatorUI() {
  if (!elements.noteCreator) return;

  elements.creatorCollapsed.addEventListener('click', expandNoteCreator);
  elements.btnCreatorClose.addEventListener('click', closeNoteCreator);

  // Auto-Save Note Creator on Clicking Outside
  document.addEventListener('click', (e) => {
    if (creatorColorWrapper && !creatorColorWrapper.contains(e.target)) {
      creatorColorWrapper.classList.remove('open');
    }
    if (!elements.noteCreator.contains(e.target) && !elements.creatorExpanded.classList.contains('hidden')) {
      closeNoteCreator();
    }
  });

  // Note Creator Tag adding
  elements.creatorTagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = elements.creatorTagInput.value.trim().toLowerCase();
      if (val && !state.noteCreatorTags.includes(val)) {
        state.noteCreatorTags.push(val);
        elements.creatorTagInput.value = '';
        renderCreatorTags();
      }
    }
  });

  // Switch from creator title to creator body/checklist on Enter
  elements.creatorTitle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (state.isCreatorChecklistMode) {
        const firstInput = elements.creatorChecklistView.querySelector('.modal-checklist-input');
        if (firstInput) firstInput.focus();
      } else {
        elements.creatorBody.focus();
      }
    }
  });

  // Creator Pin Toggle
  elements.btnCreatorPin.addEventListener('click', () => {
    state.isCreatorPinned = !state.isCreatorPinned;
    updateCreatorPinButton();
  });

  // Creator Color Picker toggle and swatch handling
  const btnCreatorColor = elements.noteCreator.querySelector('#btn-creator-color');
  const creatorColorWrapper = elements.noteCreator.querySelector('.color-picker-wrapper');
  if (btnCreatorColor && creatorColorWrapper) {
    btnCreatorColor.addEventListener('click', (e) => {
      e.stopPropagation();
      creatorColorWrapper.classList.toggle('open');
    });
  }

  const creatorColors = elements.noteCreator.querySelectorAll('.color-option');
  creatorColors.forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = e.currentTarget;
      creatorColors.forEach(o => {
        o.classList.remove('active');
        o.setAttribute('aria-checked', 'false');
      });
      current.classList.add('active');
      current.setAttribute('aria-checked', 'true');

      const color = current.getAttribute('data-color') || 'default';
      state.activeColor = color;

      elements.noteCreator.className = `note-creator-container color-${color}`;
      if (creatorColorWrapper) creatorColorWrapper.classList.remove('open');
    });
  });

  // Quick checklist format helper
  elements.btnQuickTodo.addEventListener('click', (e) => {
    e.stopPropagation();
    expandNoteCreator();
    state.isCreatorChecklistMode = true;
    elements.btnCreatorChecklistToggle.classList.add('active');
    elements.creatorBody.value = '- [ ] ';
    renderCreatorChecklist('- [ ] ');
    elements.creatorChecklistView.classList.remove('hidden');
    elements.creatorBody.classList.add('hidden');
    const firstInput = elements.creatorChecklistView.querySelector('.modal-checklist-input');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  });

  // Quick image helper
  elements.btnQuickImage.addEventListener('click', (e) => {
    e.stopPropagation();
    expandNoteCreator();
    elements.creatorImageInput.click();
  });

  // Creator Discard/Trash button
  elements.btnCreatorTrash.addEventListener('click', (e) => {
    e.stopPropagation();
    discardNoteCreator();
  });

  // Creator Checklist Toggle
  elements.btnCreatorChecklistToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.isCreatorChecklistMode) {
      let serialized = serializeCreatorChecklist();
      serialized = convertChecklistToText(serialized);
      elements.creatorBody.value = serialized;
      elements.creatorChecklistView.classList.add('hidden');
      elements.creatorChecklistView.innerHTML = '';
      elements.creatorBody.classList.remove('hidden');
      state.isCreatorChecklistMode = false;
      elements.btnCreatorChecklistToggle.classList.remove('active');
      elements.creatorBody.focus();
    } else {
      let bodyText = elements.creatorBody.value;
      if (!hasChecklistItems(bodyText)) {
        bodyText = convertTextToChecklist(bodyText);
        elements.creatorBody.value = bodyText;
      }
      renderCreatorChecklist(bodyText);
      elements.creatorChecklistView.classList.remove('hidden');
      elements.creatorBody.classList.add('hidden');
      state.isCreatorChecklistMode = true;
      elements.btnCreatorChecklistToggle.classList.add('active');
      const firstInput = elements.creatorChecklistView.querySelector('.modal-checklist-input');
      if (firstInput) firstInput.focus();
    }
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
        state.noteCreatorImages.push(compressed);
      } catch (err) {
        console.error('Failed to compress image:', err);
      }
    }
    e.target.value = '';
    renderCreatorImages();
  });

  // Focus textarea/checklist when clicking empty area of creator expanded container
  elements.creatorExpanded.addEventListener('click', (e) => {
    if (
      e.target.closest('input') ||
      e.target.closest('button') ||
      e.target.closest('label') ||
      e.target.closest('.tag-badge') ||
      e.target.closest('.tag-input-wrapper') ||
      e.target.closest('.note-images-preview')
    ) {
      return;
    }

    if (state.isCreatorChecklistMode) {
      const inputs = elements.creatorChecklistView.querySelectorAll('.modal-checklist-input');
      if (inputs.length > 0) {
        inputs[inputs.length - 1].focus();
      } else {
        const addBtn = elements.creatorChecklistView.querySelector('.modal-checklist-add');
        if (addBtn) addBtn.focus();
      }
    } else {
      elements.creatorBody.focus();
    }
  });
}

/**
 * Updates the note creator pin button UI (icon fill, active class, title/tooltip, and aria-label)
 */
export function updateCreatorPinButton() {
  if (!elements.btnCreatorPin) return;
  const isPinned = Boolean(state.isCreatorPinned);
  elements.btnCreatorPin.classList.toggle('active', isPinned);
  elements.btnCreatorPin.selected = isPinned;
  if (isPinned) {
    elements.btnCreatorPin.setAttribute('selected', '');
    elements.btnCreatorPin.title = t('btn_unpin_note_title');
    elements.btnCreatorPin.setAttribute('aria-label', t('btn_unpin_note_title'));
  } else {
    elements.btnCreatorPin.removeAttribute('selected');
    elements.btnCreatorPin.title = t('btn_pin_note_title');
    elements.btnCreatorPin.setAttribute('aria-label', t('btn_pin_note_title'));
  }
}

/**
 * Note Creator Expand / Collapse
 */
export function expandNoteCreator() {
  elements.creatorCollapsed.classList.add('hidden');
  elements.creatorExpanded.classList.remove('hidden');

  // Set default state
  state.isCreatorPinned = false;
  updateCreatorPinButton();
  state.activeColor = 'default';
  elements.noteCreator.className = 'note-creator-container color-default';
  const creatorColors = elements.noteCreator.querySelectorAll('.color-option');
  creatorColors.forEach(opt => {
    const isDef = opt.getAttribute('data-color') === 'default';
    opt.classList.toggle('active', isDef);
    opt.setAttribute('aria-checked', isDef ? 'true' : 'false');
  });
  const creatorColorWrapper = elements.noteCreator.querySelector('.color-picker-wrapper');
  if (creatorColorWrapper) creatorColorWrapper.classList.remove('open');
  state.noteCreatorTags = [];
  state.noteCreatorImages = [];
  state.isCreatorChecklistMode = false;
  elements.btnCreatorChecklistToggle.classList.remove('active');
  elements.creatorChecklistView.innerHTML = '';
  elements.creatorChecklistView.classList.add('hidden');
  elements.creatorBody.classList.remove('hidden');
  renderCreatorTags();
  renderCreatorImages();

  // Focus content body
  elements.creatorBody.focus();
}

export async function closeNoteCreator() {
  const title = elements.creatorTitle.value.trim();
  const body = state.isCreatorChecklistMode
    ? serializeCreatorChecklist()
    : elements.creatorBody.value.trim();

  // Auto save note if there is any content
  if (title || body || state.noteCreatorTags.length > 0 || state.noteCreatorImages.length > 0) {
    const noteId = 'note_' + crypto.randomUUID();
    const noteObj = {
      title: title,
      body: body,
      tags: [...state.noteCreatorTags],
      color: state.activeColor,
      isPinned: state.isCreatorPinned,
      isArchived: false,
      isTrashed: false,
      trashedAt: null,
      images: [...state.noteCreatorImages],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Call controller save callback
    if (state.onSaveNoteCallback) {
      await state.onSaveNoteCallback(noteId, noteObj);
    }
  }

  // Reset inputs
  elements.creatorTitle.value = '';
  elements.creatorBody.value = '';
  elements.creatorChecklistView.innerHTML = '';
  elements.creatorChecklistView.classList.add('hidden');
  elements.creatorBody.classList.remove('hidden');
  state.noteCreatorTags = [];
  state.noteCreatorImages = [];
  state.isCreatorChecklistMode = false;
  elements.btnCreatorChecklistToggle.classList.remove('active');
  renderCreatorImages();

  // Collapse UI
  elements.creatorCollapsed.classList.remove('hidden');
  elements.creatorExpanded.classList.add('hidden');
}

export function discardNoteCreator() {
  // Reset inputs without saving
  elements.creatorTitle.value = '';
  elements.creatorBody.value = '';
  elements.creatorChecklistView.innerHTML = '';
  elements.creatorChecklistView.classList.add('hidden');
  elements.creatorBody.classList.remove('hidden');
  state.noteCreatorTags = [];
  state.noteCreatorImages = [];
  state.isCreatorChecklistMode = false;
  elements.btnCreatorChecklistToggle.classList.remove('active');
  renderCreatorImages();

  // Collapse UI
  elements.creatorCollapsed.classList.remove('hidden');
  elements.creatorExpanded.classList.add('hidden');
}

export function renderCreatorTags() {
  if (!elements.creatorTagsList) return;
  elements.creatorTagsList.innerHTML = '';
  state.noteCreatorTags.forEach(tag => {
    const chip = document.createElement('md-chip');
    chip.setAttribute('label', tag);
    chip.setAttribute('variant', 'input');
    chip.setAttribute('removable', '');
    chip.addEventListener('remove', (e) => {
      e.stopPropagation();
      state.noteCreatorTags = state.noteCreatorTags.filter(t => t !== tag);
      renderCreatorTags();
    });
    elements.creatorTagsList.appendChild(chip);
  });
}

export function renderCreatorImages() {
  const container = elements.creatorImagesPreview;
  renderImageGrid(container, state.noteCreatorImages, true, (index) => {
    state.noteCreatorImages.splice(index, 1);
    renderCreatorImages();
  });
}
