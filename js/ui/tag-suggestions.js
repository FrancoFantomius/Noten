/**
 * Noten UI - Tag Auto-suggestions & Autocomplete
 */

import { state } from './state.js';

/**
 * Returns all distinct existing tags across non-trashed notes in lowercase
 * @returns {string[]}
 */
export function getAllExistingTags() {
  const tagsSet = new Set();
  if (Array.isArray(state.decryptedNotes)) {
    state.decryptedNotes.forEach(note => {
      if (!note.isTrashed && Array.isArray(note.tags)) {
        note.tags.forEach(t => {
          if (typeof t === 'string') {
            const trimmed = t.trim().toLowerCase();
            if (trimmed) {
              tagsSet.add(trimmed);
            }
          }
        });
      }
    });
  }
  return Array.from(tagsSet).sort();
}

/**
 * Attaches tag auto-suggestions underneath a tag input
 * @param {Object} options
 * @param {HTMLInputElement} options.input - The tag input element
 * @param {HTMLElement} options.container - The suggestion container wrapper
 * @param {HTMLElement} options.list - The md-chip-set element for suggestions
 * @param {Function} options.getCurrentTags - Returns array of current tags on the note
 * @param {Function} options.onAddTag - Callback when a tag is selected / added
 * @returns {{ hide: Function, update: Function }}
 */
export function attachTagSuggestions({ input, container, list, getCurrentTags, onAddTag }) {
  if (!input || !container || !list) {
    return { hide: () => {}, update: () => {} };
  }

  let currentSuggestions = [];

  function updateSuggestions() {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      hideSuggestions();
      return;
    }

    const currentTags = (getCurrentTags() || []).map(t => (typeof t === 'string' ? t.toLowerCase() : ''));
    const allTags = getAllExistingTags();

    // Filter tags not already added to the note and containing query
    const matching = allTags.filter(t => !currentTags.includes(t) && t.includes(query));

    // Sort: prefix matches first, then alphabetical
    matching.sort((a, b) => {
      const aStarts = a.startsWith(query);
      const bStarts = b.startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.localeCompare(b);
    });

    currentSuggestions = matching;

    if (matching.length === 0) {
      hideSuggestions();
      return;
    }

    // Render suggestion chips using md-chip
    list.innerHTML = '';
    matching.forEach((tag) => {
      const chip = document.createElement('md-chip');
      chip.setAttribute('variant', 'suggestion');
      chip.setAttribute('label', tag);
      chip.setAttribute('role', 'button');
      chip.setAttribute('tabindex', '-1');

      // Prevent input from blurring before click completes
      chip.addEventListener('pointerdown', (e) => {
        e.preventDefault();
      });

      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        selectTag(tag);
      });

      list.appendChild(chip);
    });

    container.classList.remove('hidden');
  }

  function hideSuggestions() {
    currentSuggestions = [];
    container.classList.add('hidden');
    list.innerHTML = '';
  }

  function addTags(tagsStringOrArray) {
    const rawTags = Array.isArray(tagsStringOrArray)
      ? tagsStringOrArray
      : String(tagsStringOrArray).split(',');

    rawTags.forEach(t => {
      const cleanTag = t.trim().toLowerCase();
      if (cleanTag) {
        onAddTag(cleanTag);
      }
    });
  }

  function selectTag(tag) {
    addTags(tag);
    input.value = '';
    hideSuggestions();
    input.focus();
  }

  // Input listeners
  input.addEventListener('input', () => {
    const rawVal = input.value;
    if (rawVal.includes(',')) {
      const parts = rawVal.split(',');
      const tagsToAdd = parts.slice(0, -1);
      tagsToAdd.forEach(t => {
        const clean = t.trim().toLowerCase();
        if (clean) {
          onAddTag(clean);
        }
      });
      input.value = parts[parts.length - 1].trimStart();
    }
    updateSuggestions();
  });

  input.addEventListener('focus', () => {
    if (input.value.trim()) {
      updateSuggestions();
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (!container.contains(document.activeElement)) {
        hideSuggestions();
      }
    }, 150);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (currentSuggestions.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        selectTag(currentSuggestions[0]);
      }
    } else if (e.key === 'Enter') {
      const val = input.value.trim().toLowerCase();
      if (val) {
        e.preventDefault();
        e.stopPropagation();
        addTags(val);
        input.value = '';
        hideSuggestions();
      }
    } else if (e.key === 'Escape') {
      if (currentSuggestions.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        hideSuggestions();
      }
    }
  });

  return {
    hide: hideSuggestions,
    update: updateSuggestions
  };
}
