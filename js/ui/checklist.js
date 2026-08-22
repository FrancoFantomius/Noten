/**
 * Noten UI - Checklist Logic
 */

import { t } from '../i18n.js';
import { state, elements } from './state.js';
import { escapeHtml } from './utils.js';

export const CHECKLIST_REGEX = /^(\s*)- \[([ xX])\] (.*)$/;

/**
 * Returns true if the body text contains any checklist items (- [ ] or - [x]).
 */
export function hasChecklistItems(body) {
  if (!body) return false;
  return body.split('\n').some(line => CHECKLIST_REGEX.test(line));
}

/**
 * Converts plain text lines into checklist items using the markdown prefix `- [ ]`.
 */
export function convertTextToChecklist(text) {
  if (!text) return '- [ ] ';
  return text.split('\n').map(line => {
    if (CHECKLIST_REGEX.test(line)) {
      return line;
    }
    return `- [ ] ${line}`;
  }).join('\n');
}

/**
 * Strips the checklist prefixes from the text to restore it to plain text.
 */
export function convertChecklistToText(text) {
  if (!text) return '';
  return text.split('\n').map(line => {
    const match = line.match(CHECKLIST_REGEX);
    if (match) {
      return match[3];
    }
    return line;
  }).join('\n');
}

/**
 * Builds a DOM element containing rendered checklist items and plain text.
 * Checkboxes are interactive and toggle the note body on click.
 */
export function buildChecklistDOM(bodyText, noteId, isTruncated, isTrashed = false) {
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
      const indent = match[1] || '';
      const isChecked = match[2].toLowerCase() === 'x';
      const labelText = match[3];

      const item = document.createElement('div');
      item.className = `checklist-item ${isChecked ? 'checked' : ''}`;
      item.style.paddingLeft = `${indent.length * 8}px`;

      item.innerHTML = `
        <md-checkbox ${isChecked ? 'checked' : ''} ${isTrashed ? 'disabled' : ''} data-note-id="${noteId}" data-line-index="${lineIndex}"></md-checkbox>
        <span class="checklist-label">${escapeHtml(labelText)}</span>
      `;

      const checkbox = item.querySelector('md-checkbox');

      if (!isTrashed) {
        // Toggle handler
        checkbox.addEventListener('change', (e) => {
          e.stopPropagation();
          toggleChecklistItem(noteId, lineIndex, checkbox.checked);
          item.classList.toggle('checked', checkbox.checked);
        });

        // Prevent the label click from bubbling to open the modal
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!e.target.closest('md-checkbox')) {
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      }

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
export async function toggleChecklistItem(noteId, lineIndex, isChecked) {
  const note = state.decryptedNotes.find(n => n.id === noteId);
  if (!note) return;

  const lines = note.body.split('\n');
  if (lineIndex >= lines.length) return;

  const match = lines[lineIndex].match(CHECKLIST_REGEX);
  if (!match) return;

  const indent = match[1] || '';
  const newMarker = isChecked ? 'x' : ' ';
  lines[lineIndex] = `${indent}- [${newMarker}] ${match[3]}`;
  note.body = lines.join('\n');
  note.updatedAt = Date.now();

  // Update the modal textarea if this note is currently being edited
  if (state.editingNoteId === noteId) {
    elements.modalBodyText.value = note.body;
  }

  if (state.onSaveNoteCallback) {
    await state.onSaveNoteCallback(note.id, note);
  }
}

/**
 * Renders an editable checklist view inside the modal.
 */
export function renderModalChecklist(bodyText) {
  elements.modalChecklistView.innerHTML = '';
  const lines = bodyText.split('\n');
  let consecutiveText = [];

  const note = state.decryptedNotes.find(n => n.id === state.editingNoteId);
  const isTrashed = note && note.isTrashed;

  const flushTextLines = () => {
    if (consecutiveText.length > 0) {
      const textEl = document.createElement('textarea');
      textEl.className = 'modal-checklist-text';
      textEl.value = consecutiveText.join('\n');
      textEl.rows = consecutiveText.length;
      textEl.placeholder = t('checklist_text_placeholder');
      textEl.readOnly = isTrashed;
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
      const indent = match[1] || '';
      const isChecked = match[2].toLowerCase() === 'x';
      const labelText = match[3];

      const item = createChecklistItemElement(labelText, isChecked, indent, true, isTrashed);
      elements.modalChecklistView.appendChild(item);
    } else {
      consecutiveText.push(line);
    }
  });

  flushTextLines();

  if (!isTrashed) {
    const addBtn = document.createElement('button');
    addBtn.className = 'modal-checklist-add';
    addBtn.innerHTML = `<span class="material-symbols-outlined">add</span> <span>${t('checklist_add_item')}</span>`;
    addBtn.addEventListener('click', () => {
      const newItem = addChecklistItemAfter(null, true);
      newItem.querySelector('.modal-checklist-input').focus();
    });
    elements.modalChecklistView.appendChild(addBtn);
  }


}

/**
 * Saves the current modal checklist view state to the database and syncs.
 */
export async function saveModalChecklistChanges() {
  if (!state.editingNoteId) return;
  const note = state.decryptedNotes.find(n => n.id === state.editingNoteId);
  if (note && !note.isTrashed) {
    const bodyVal = serializeModalChecklist();
    note.body = bodyVal;
    note.updatedAt = Date.now();
    elements.modalBodyText.value = bodyVal;
    if (state.onSaveNoteCallback) {
      await state.onSaveNoteCallback(note.id, note);
    }
  }
}

/**
 * Helper to determine which element the dragged item is over.
 */
export function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.modal-checklist-item:not(.dragging)')];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/**
 * Indent a checklist item (add 2 spaces).
 */
export function indentChecklistItem(item, isModal) {
  const currentIndent = item.dataset.indent || '';
  const newIndent = currentIndent + '  ';
  item.dataset.indent = newIndent;
  item.style.marginLeft = `${newIndent.length * 8}px`;
  if (isModal) {
    saveModalChecklistChanges();
  }
}

/**
 * Outdent a checklist item (remove 2 spaces).
 */
export function outdentChecklistItem(item, isModal) {
  const currentIndent = item.dataset.indent || '';
  if (currentIndent.length >= 2) {
    const newIndent = currentIndent.substring(2);
    item.dataset.indent = newIndent;
    item.style.marginLeft = `${newIndent.length * 8}px`;
    if (isModal) {
      saveModalChecklistChanges();
    }
  }
}

/**
 * Create a checklist item element with checkboxes, drag handles, text input, and indentation actions.
 */
export function createChecklistItemElement(text, isChecked, indent, isModal, isTrashed) {
  const item = document.createElement('div');
  item.className = `modal-checklist-item ${isChecked ? 'checked' : ''}`;
  item.dataset.indent = indent || '';
  item.style.marginLeft = `${(indent || '').length * 8}px`;

  if (!isTrashed) {
    item.setAttribute('draggable', 'true');
  }

  const dragHandleHtml = isTrashed ? '' : `
    <div class="checklist-drag-handle" title="${t('checklist_drag_title')}">
      <span class="material-symbols-outlined">drag_indicator</span>
    </div>
  `;

  const actionsHtml = isTrashed ? '' : `
    <div class="checklist-actions">
      <button class="btn-icon checklist-outdent" title="${t('checklist_outdent_title')}">
        <span class="material-symbols-outlined">chevron_left</span>
      </button>
      <button class="btn-icon checklist-indent" title="${t('checklist_indent_title')}">
        <span class="material-symbols-outlined">chevron_right</span>
      </button>
      <button class="modal-checklist-delete btn-icon" title="${t('checklist_remove_item_title')}">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
  `;

  item.innerHTML = `
    ${dragHandleHtml}
    <md-checkbox ${isChecked ? 'checked' : ''} ${isTrashed ? 'disabled' : ''}></md-checkbox>
    <input type="text" class="modal-checklist-input" value="" ${isTrashed ? 'readonly' : ''}>
    ${actionsHtml}
  `;

  const textInput = item.querySelector('.modal-checklist-input');
  textInput.value = text;

  if (!isTrashed) {
    const checkbox = item.querySelector('md-checkbox');
    checkbox.addEventListener('change', () => {
      item.classList.toggle('checked', checkbox.checked);
      if (isModal) {
        saveModalChecklistChanges();
      }
    });

    const deleteBtn = item.querySelector('.modal-checklist-delete');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      item.remove();
      if (isModal) {
        saveModalChecklistChanges();
      }
    });

    const indentBtn = item.querySelector('.checklist-indent');
    indentBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      indentChecklistItem(item, isModal);
    });

    const outdentBtn = item.querySelector('.checklist-outdent');
    outdentBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      outdentChecklistItem(item, isModal);
    });

    // Keyboard navigation and actions
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const newItem = addChecklistItemAfter(item, isModal);
        newItem.querySelector('.modal-checklist-input').focus();
      } else if (e.key === 'Backspace' && textInput.value === '') {
        e.preventDefault();
        const prevItem = item.previousElementSibling;
        if (prevItem && prevItem.classList.contains('modal-checklist-item')) {
          const prevInput = prevItem.querySelector('.modal-checklist-input');
          if (prevInput) prevInput.focus();
        }
        item.remove();
        if (isModal) {
          saveModalChecklistChanges();
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          outdentChecklistItem(item, isModal);
        } else {
          indentChecklistItem(item, isModal);
        }
      } else if (e.key === 'ArrowUp' && e.altKey) {
        e.preventDefault();
        const prev = item.previousElementSibling;
        if (prev && prev.classList.contains('modal-checklist-item')) {
          item.parentNode.insertBefore(item, prev);
          textInput.focus();
          if (isModal) {
            saveModalChecklistChanges();
          }
        }
      } else if (e.key === 'ArrowDown' && e.altKey) {
        e.preventDefault();
        const next = item.nextElementSibling;
        if (next && next.classList.contains('modal-checklist-item')) {
          item.parentNode.insertBefore(item, next.nextSibling);
          textInput.focus();
          if (isModal) {
            saveModalChecklistChanges();
          }
        }
      }
    });

    // Drag events
    item.addEventListener('dragstart', (e) => {
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      if (isModal) {
        saveModalChecklistChanges();
      }
    });
  }

  return item;
}

/**
 * Adds a new checklist item below the current one, inheriting its indentation level.
 */
export function addChecklistItemAfter(afterItem, isModal) {
  const indent = afterItem ? (afterItem.dataset.indent || '') : '';
  const newItem = createChecklistItemElement('', false, indent, isModal, false);
  const container = isModal ? elements.modalChecklistView : elements.creatorChecklistView;
  const addButton = container.querySelector('.modal-checklist-add');

  if (afterItem && afterItem.nextSibling) {
    container.insertBefore(newItem, afterItem.nextSibling);
  } else if (addButton) {
    container.insertBefore(newItem, addButton);
  } else {
    container.appendChild(newItem);
  }

  return newItem;
}

/**
 * Serializes the modal checklist view back to plain text with - [ ] / - [x] syntax.
 */
export function serializeModalChecklist() {
  const children = elements.modalChecklistView.children;
  const lines = [];

  for (const child of children) {
    if (child.classList.contains('modal-checklist-item')) {
      const checkbox = child.querySelector('md-checkbox');
      const textInput = child.querySelector('.modal-checklist-input');
      const marker = checkbox && checkbox.checked ? 'x' : ' ';
      const indent = child.dataset.indent || '';
      lines.push(`${indent}- [${marker}] ${textInput.value}`);
    } else if (child.classList.contains('modal-checklist-text')) {
      lines.push(child.value);
    }
  }

  return lines.join('\n').trim();
}

/**
 * Renders an editable checklist view inside the note creator.
 */
export function renderCreatorChecklist(bodyText) {
  elements.creatorChecklistView.innerHTML = '';
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
      elements.creatorChecklistView.appendChild(textEl);
      consecutiveText = [];
    }
  };

  lines.forEach((line) => {
    const match = line.match(CHECKLIST_REGEX);
    if (match) {
      flushTextLines();
      const indent = match[1] || '';
      const isChecked = match[2].toLowerCase() === 'x';
      const labelText = match[3];

      const item = createChecklistItemElement(labelText, isChecked, indent, false, false);
      elements.creatorChecklistView.appendChild(item);
    } else {
      consecutiveText.push(line);
    }
  });

  flushTextLines();

  const addBtn = document.createElement('button');
  addBtn.className = 'modal-checklist-add';
  addBtn.innerHTML = `<span class="material-symbols-outlined">add</span> <span>${t('checklist_add_item')}</span>`;
  addBtn.addEventListener('click', () => {
    const newItem = addChecklistItemAfter(null, false);
    newItem.querySelector('.modal-checklist-input').focus();
  });
  elements.creatorChecklistView.appendChild(addBtn);


}

/**
 * Serializes the creator checklist view back to plain text.
 */
export function serializeCreatorChecklist() {
  const children = elements.creatorChecklistView.children;
  const lines = [];

  for (const child of children) {
    if (child.classList.contains('modal-checklist-item')) {
      const checkbox = child.querySelector('md-checkbox');
      const textInput = child.querySelector('.modal-checklist-input');
      const marker = checkbox && checkbox.checked ? 'x' : ' ';
      const indent = child.dataset.indent || '';
      lines.push(`${indent}- [${marker}] ${textInput.value}`);
    } else if (child.classList.contains('modal-checklist-text')) {
      lines.push(child.value);
    }
  }

  return lines.join('\n').trim();
}

/**
 * Auto-resize a textarea to fit its content.
 */
export function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}
