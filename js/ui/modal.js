/**
 * Noten UI - Note Editor Modal
 */

import { t } from '../i18n.js';
import { state, elements } from './state.js';
import { formatDate, compressImage, renderImageGrid } from './utils.js';
import {
  hasChecklistItems,
  convertTextToChecklist,
  convertChecklistToText,
  renderModalChecklist,
  serializeModalChecklist
} from './checklist.js';

/**
 * Initializes Note Modal event listeners
 */
export function initModalUI() {
  if (!elements.noteModal) return;

  elements.btnModalClose.addEventListener('click', saveAndCloseModal);
  elements.btnModalBack.addEventListener('click', saveAndCloseModal);

  // Closing Modal on background click
  elements.noteModal.addEventListener('click', (e) => {
    if (e.target === elements.noteModal) {
      saveAndCloseModal();
    }
  });

  // Close open note modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.editingNoteId) {
        e.preventDefault();
        saveAndCloseModal();
      }
    }
  });

  // Modal Pin Toggle
  elements.btnModalPin.addEventListener('click', () => {
    state.isModalPinned = !state.isModalPinned;
    updateModalPinButton();
  });

  // Modal Color Picker toggle and swatch handling
  const btnModalColor = elements.noteModal.querySelector('#btn-modal-color');
  const modalColorWrapper = elements.noteModal.querySelector('.color-picker-wrapper');
  if (btnModalColor && modalColorWrapper) {
    btnModalColor.addEventListener('click', (e) => {
      e.stopPropagation();
      modalColorWrapper.classList.toggle('open');
    });
  }

  // Dismiss modal color picker on outside click
  document.addEventListener('click', (e) => {
    if (modalColorWrapper && !modalColorWrapper.contains(e.target)) {
      modalColorWrapper.classList.remove('open');
    }
  });

  const modalColors = elements.noteModal.querySelectorAll('.color-option');
  modalColors.forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = e.currentTarget;
      modalColors.forEach(o => {
        o.classList.remove('active');
        o.setAttribute('aria-checked', 'false');
      });
      current.classList.add('active');
      current.setAttribute('aria-checked', 'true');

      const color = current.getAttribute('data-color') || 'default';
      state.modalActiveColor = color;
      elements.modalCard.className = `modal-card color-${color}`;
      if (modalColorWrapper) modalColorWrapper.classList.remove('open');
    });
  });

  // Modal Tag input adding
  elements.modalTagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = elements.modalTagInput.value.trim().toLowerCase();
      if (val && !state.noteModalTags.includes(val)) {
        state.noteModalTags.push(val);
        elements.modalTagInput.value = '';
        renderModalTags();
      }
    }
  });

  // Focus textarea/checklist when clicking empty area of modal body
  elements.modalBody.addEventListener('click', (e) => {
    if (
      e.target.closest('input') ||
      e.target.closest('button') ||
      e.target.closest('label') ||
      e.target.closest('.tag-badge') ||
      e.target.closest('.tag-input-wrapper')
    ) {
      return;
    }

    if (state.isModalChecklistMode) {
      const inputs = elements.modalChecklistView.querySelectorAll('.modal-checklist-input');
      if (inputs.length > 0) {
        inputs[inputs.length - 1].focus();
      } else {
        const addBtn = elements.modalChecklistView.querySelector('.modal-checklist-add');
        if (addBtn) addBtn.focus();
      }
    } else {
      elements.modalBodyText.focus();
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
        state.noteModalImages.push(compressed);
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
      if (state.isModalChecklistMode) {
        const firstInput = elements.modalChecklistView.querySelector('.modal-checklist-input');
        if (firstInput) firstInput.focus();
      } else {
        elements.modalBodyText.focus();
      }
    }
  });

  // Modal Checklist Toggle
  elements.btnModalChecklistToggle.addEventListener('click', () => {
    if (state.isModalChecklistMode) {
      let serialized = serializeModalChecklist();
      serialized = convertChecklistToText(serialized);
      elements.modalBodyText.value = serialized;
      elements.modalChecklistView.classList.add('hidden');
      elements.modalChecklistView.innerHTML = '';
      elements.modalBodyText.classList.remove('hidden');
      state.isModalChecklistMode = false;
      elements.btnModalChecklistToggle.classList.remove('active');
      elements.modalBodyText.focus();
    } else {
      let bodyText = elements.modalBodyText.value;
      if (!hasChecklistItems(bodyText)) {
        bodyText = convertTextToChecklist(bodyText);
        elements.modalBodyText.value = bodyText;
      }
      renderModalChecklist(bodyText);
      elements.modalChecklistView.classList.remove('hidden');
      elements.modalBodyText.classList.add('hidden');
      state.isModalChecklistMode = true;
      elements.btnModalChecklistToggle.classList.add('active');
      const firstInput = elements.modalChecklistView.querySelector('.modal-checklist-input');
      if (firstInput) firstInput.focus();
    }
  });

  // Modal Copy Action
  if (elements.btnModalCopy) {
    elements.btnModalCopy.addEventListener('click', async () => {
      if (!state.editingNoteId) return;

      const existingNote = state.decryptedNotes.find(n => n.id === state.editingNoteId);
      if (existingNote && existingNote.isTrashed) return;

      const titleVal = elements.modalTitle.value.trim();
      const bodyVal = state.isModalChecklistMode
        ? serializeModalChecklist()
        : elements.modalBodyText.value.trim();
      const tags = [...state.noteModalTags];
      const color = state.modalActiveColor;
      const isPinned = state.isModalPinned;
      const isArchived = existingNote ? existingNote.isArchived : false;
      const images = [...state.noteModalImages];

      // Save current note state and close modal
      await saveAndCloseModal();

      // Create new note with the exact copied options & content
      const newNoteId = 'note_' + crypto.randomUUID();
      const copyNoteObj = {
        title: titleVal,
        body: bodyVal,
        tags: tags,
        color: color,
        isPinned: isPinned,
        isArchived: isArchived,
        isTrashed: false,
        trashedAt: null,
        images: images,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      if (state.onSaveNoteCallback) {
        await state.onSaveNoteCallback(newNoteId, copyNoteObj);
      }
    });
  }

  // Modal Archive Action
  elements.btnModalArchive.addEventListener('click', async () => {
    if (state.editingNoteId) {
      const note = state.decryptedNotes.find(n => n.id === state.editingNoteId);
      if (note) {
        note.isArchived = !note.isArchived;
        note.isPinned = false; // Unpin if archived
        note.updatedAt = Date.now();
        await state.onSaveNoteCallback(note.id, note);
        closeModal();
      }
    }
  });

  // Modal Trash / Delete Action
  elements.btnModalTrash.addEventListener('click', async () => {
    if (state.editingNoteId) {
      const note = state.decryptedNotes.find(n => n.id === state.editingNoteId);
      if (note) {
        if (note.isTrashed) {
          note.isTrashed = false;
          note.trashedAt = null;
          note.updatedAt = Date.now();
          await state.onSaveNoteCallback(note.id, note);
          closeModal();
        } else {
          note.isTrashed = true;
          note.trashedAt = Date.now();
          note.isPinned = false;
          note.updatedAt = Date.now();
          await state.onSaveNoteCallback(note.id, note);
          closeModal();
        }
      }
    }
  });

  // Modal Delete Forever Action
  elements.btnModalDeleteForever.addEventListener('click', async () => {
    if (state.editingNoteId) {
      const note = state.decryptedNotes.find(n => n.id === state.editingNoteId);
      if (note && note.isTrashed) {
        if (confirm(t('confirm_delete_note'))) {
          await state.onDeleteNoteCallback(note.id);
          closeModal();
        }
      }
    }
  });
}

/**
 * Updates the modal pin button UI (icon fill, active class, title/tooltip, and aria-label)
 */
export function updateModalPinButton() {
  if (!elements.btnModalPin) return;
  const isPinned = Boolean(state.isModalPinned);
  elements.btnModalPin.classList.toggle('active', isPinned);
  elements.btnModalPin.selected = isPinned;
  if (isPinned) {
    elements.btnModalPin.setAttribute('selected', '');
    elements.btnModalPin.title = t('btn_unpin_note_title');
    elements.btnModalPin.setAttribute('aria-label', t('btn_unpin_note_title'));
  } else {
    elements.btnModalPin.removeAttribute('selected');
    elements.btnModalPin.title = t('btn_pin_note_title');
    elements.btnModalPin.setAttribute('aria-label', t('btn_pin_note_title'));
  }
}

/**
 * Note Modal (Edit dialog)
 */
export function openNoteModal(noteId) {
  const note = state.decryptedNotes.find(n => n.id === noteId);
  if (!note) return;

  state.editingNoteId = noteId;
  elements.modalTitle.value = note.title || '';
  elements.modalBodyText.value = note.body || '';
  state.isModalPinned = note.isPinned || false;
  updateModalPinButton();
  state.modalActiveColor = note.color || 'default';
  elements.modalCard.className = `modal-card color-${state.modalActiveColor}`;

  const modalColors = elements.noteModal.querySelectorAll('.color-option');
  modalColors.forEach(opt => {
    const c = opt.getAttribute('data-color');
    const isActive = c === state.modalActiveColor;
    opt.classList.toggle('active', isActive);
    opt.setAttribute('aria-checked', isActive ? 'true' : 'false');
  });
  if (elements.modalColorPickerWrapper) {
    elements.modalColorPickerWrapper.classList.remove('open');
  }

  state.noteModalTags = [...note.tags];
  renderModalTags();

  state.noteModalImages = note.images ? [...note.images] : [];
  renderModalImages();

  elements.modalLastEdited.textContent = t('modal_last_edited', { time: formatDate(note.updatedAt) });

  elements.btnModalArchive.setAttribute('icon', note.isArchived ? 'unarchive' : 'archive');
  elements.btnModalArchive.title = note.isArchived ? t('btn_modal_archive_unarchive_title') : t('btn_modal_archive_title');

  elements.btnModalTrash.setAttribute('icon', note.isTrashed ? 'restore' : 'delete');
  elements.btnModalTrash.title = note.isTrashed ? t('btn_modal_trash_restore_title') : t('btn_modal_trash_delete_title');
  elements.btnModalTrash.className = note.isTrashed ? 'btn-icon text-green' : 'btn-icon';

  const isTrashed = note.isTrashed || false;

  elements.modalTitle.readOnly = isTrashed;
  elements.modalBodyText.readOnly = isTrashed;

  const tagInputWrapper = elements.modalTagInput.closest('.tag-input-wrapper');
  if (tagInputWrapper) {
    tagInputWrapper.classList.toggle('hidden', isTrashed);
  }

  elements.modalColorPickerWrapper.classList.toggle('hidden', isTrashed);
  elements.btnModalImage.classList.toggle('hidden', isTrashed);
  if (elements.btnModalCopy) {
    elements.btnModalCopy.classList.toggle('hidden', isTrashed);
  }
  elements.btnModalArchive.classList.toggle('hidden', isTrashed);
  elements.btnModalPin.classList.toggle('hidden', isTrashed);
  elements.btnModalDeleteForever.classList.toggle('hidden', !isTrashed);

  const noteHasChecklist = hasChecklistItems(note.body);
  elements.btnModalChecklistToggle.classList.remove('hidden');
  if (noteHasChecklist) {
    state.isModalChecklistMode = true;
    elements.btnModalChecklistToggle.classList.add('active');
    renderModalChecklist(note.body);
    elements.modalChecklistView.classList.remove('hidden');
    elements.modalBodyText.classList.add('hidden');
  } else {
    state.isModalChecklistMode = false;
    elements.btnModalChecklistToggle.classList.remove('active');
    elements.modalChecklistView.classList.add('hidden');
    elements.modalChecklistView.innerHTML = '';
    elements.modalBodyText.classList.remove('hidden');
  }

  if (isTrashed) {
    elements.btnModalChecklistToggle.classList.add('hidden');
  }

  elements.noteModal.classList.add('active');

  if (window.location.hash !== `#${noteId}`) {
    state.isNoteModalHashPushed = true;
    window.location.hash = noteId;
  }

  if (!isTrashed) {
    if (state.isModalChecklistMode) {
      const firstInput = elements.modalChecklistView.querySelector('.modal-checklist-input');
      if (firstInput) setTimeout(() => firstInput.focus(), 100);
    } else {
      setTimeout(() => elements.modalBodyText.focus(), 100);
    }
  }
}

export function openNewNoteModal() {
  state.editingNoteId = 'note_' + crypto.randomUUID();
  elements.modalTitle.value = '';
  elements.modalBodyText.value = '';
  state.isModalPinned = false;
  updateModalPinButton();
  state.modalActiveColor = 'default';
  elements.modalCard.className = `modal-card color-default`;

  elements.modalTitle.readOnly = false;
  elements.modalBodyText.readOnly = false;

  const tagInputWrapper = elements.modalTagInput.closest('.tag-input-wrapper');
  if (tagInputWrapper) {
    tagInputWrapper.classList.remove('hidden');
  }

  elements.modalColorPickerWrapper.classList.remove('hidden');
  elements.btnModalImage.classList.remove('hidden');
  if (elements.btnModalCopy) {
    elements.btnModalCopy.classList.remove('hidden');
  }
  elements.btnModalArchive.classList.remove('hidden');
  elements.btnModalPin.classList.remove('hidden');
  elements.btnModalDeleteForever.classList.add('hidden');

  const modalColors = elements.noteModal.querySelectorAll('.color-option');
  modalColors.forEach(opt => {
    const c = opt.getAttribute('data-color');
    const isDef = c === 'default';
    opt.classList.toggle('active', isDef);
    opt.setAttribute('aria-checked', isDef ? 'true' : 'false');
  });
  if (elements.modalColorPickerWrapper) {
    elements.modalColorPickerWrapper.classList.remove('open');
  }

  state.noteModalTags = [];
  renderModalTags();

  state.noteModalImages = [];
  renderModalImages();

  elements.modalLastEdited.textContent = '';

  elements.btnModalArchive.setAttribute('icon', 'archive');
  elements.btnModalArchive.title = t('btn_modal_archive_title');

  elements.btnModalTrash.setAttribute('icon', 'delete');
  elements.btnModalTrash.title = t('btn_modal_trash_delete_title');
  elements.btnModalTrash.className = 'btn-icon';

  state.isModalChecklistMode = false;
  elements.btnModalChecklistToggle.classList.remove('hidden');
  elements.btnModalChecklistToggle.classList.remove('active');
  elements.modalChecklistView.classList.add('hidden');
  elements.modalChecklistView.innerHTML = '';
  elements.modalBodyText.classList.remove('hidden');

  elements.noteModal.classList.add('active');

  if (window.location.hash !== `#${state.editingNoteId}`) {
    state.isNoteModalHashPushed = true;
    window.location.hash = state.editingNoteId;
  }

  setTimeout(() => elements.modalBodyText.focus(), 100);
}

export async function saveAndCloseModal() {
  if (!state.editingNoteId) return;

  const note = state.decryptedNotes.find(n => n.id === state.editingNoteId);
  if (note && note.isTrashed) {
    closeModal();
    return;
  }

  const titleVal = elements.modalTitle.value.trim();
  const bodyVal = state.isModalChecklistMode
    ? serializeModalChecklist()
    : elements.modalBodyText.value.trim();

  if (!note) {
    if (titleVal || bodyVal || state.noteModalTags.length > 0 || state.noteModalImages.length > 0) {
      const noteObj = {
        title: titleVal,
        body: bodyVal,
        tags: [...state.noteModalTags],
        color: state.modalActiveColor,
        isPinned: state.isModalPinned,
        isArchived: false,
        isTrashed: false,
        trashedAt: null,
        images: [...state.noteModalImages],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      if (state.onSaveNoteCallback) {
        await state.onSaveNoteCallback(state.editingNoteId, noteObj);
      }
    }
  } else {
    const hasChanged = note.title !== titleVal ||
      note.body !== bodyVal ||
      note.color !== state.modalActiveColor ||
      note.isPinned !== state.isModalPinned ||
      JSON.stringify(note.tags) !== JSON.stringify(state.noteModalTags) ||
      JSON.stringify(note.images || []) !== JSON.stringify(state.noteModalImages);

    if (hasChanged) {
      note.title = titleVal;
      note.body = bodyVal;
      note.color = state.modalActiveColor;
      note.isPinned = state.isModalPinned;
      note.tags = [...state.noteModalTags];
      note.images = [...state.noteModalImages];
      note.updatedAt = Date.now();

      if (state.onSaveNoteCallback) {
        await state.onSaveNoteCallback(note.id, note);
      }
    }
  }

  closeModal();
}

export function closeModal() {
  const closedNoteId = state.editingNoteId;

  elements.noteModal.classList.remove('active');

  state.editingNoteId = null;
  state.noteModalImages = [];
  state.isModalChecklistMode = false;
  elements.modalChecklistView.innerHTML = '';
  elements.modalChecklistView.classList.add('hidden');
  elements.modalBodyText.classList.remove('hidden');
  elements.btnModalChecklistToggle.classList.add('hidden');
  elements.btnModalChecklistToggle.classList.remove('active');
  renderModalImages();

  if (closedNoteId && window.location.hash === `#${closedNoteId}`) {
    if (state.isNoteModalHashPushed) {
      state.isNoteModalHashPushed = false;
      history.back();
    } else {
      history.replaceState("", document.title, window.location.pathname + window.location.search);
    }
  } else {
    state.isNoteModalHashPushed = false;
  }
}

export function renderModalTags() {
  if (!elements.modalTagsList) return;
  elements.modalTagsList.innerHTML = '';
  const note = state.decryptedNotes.find(n => n.id === state.editingNoteId);
  const isTrashed = note && note.isTrashed;

  state.noteModalTags.forEach(tag => {
    const chip = document.createElement('md-chip');
    chip.setAttribute('label', tag);
    chip.setAttribute('variant', 'input');
    if (!isTrashed) {
      chip.setAttribute('removable', '');
      chip.addEventListener('remove', (e) => {
        e.stopPropagation();
        state.noteModalTags = state.noteModalTags.filter(t => t !== tag);
        renderModalTags();
      });
    }
    elements.modalTagsList.appendChild(chip);
  });
}

export function renderModalImages() {
  const container = elements.modalImagesPreview;
  const note = state.decryptedNotes.find(n => n.id === state.editingNoteId);
  const isTrashed = note && note.isTrashed;

  renderImageGrid(container, state.noteModalImages, !isTrashed, (index) => {
    state.noteModalImages.splice(index, 1);
    renderModalImages();
  });
}
