/**
 * Noten UI - Link Utilities and Interactive Link Editor
 */

export function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export const URL_REGEX = /https?:\/\/[^\s<>"'`]+/gi;

/**
 * Shortens a URL to its relevant parts:
 * - Strips protocol (http://, https://) and 'www.'
 * - If path has more beyond '/' or has query/hash, appends '/...'
 * - Otherwise outputs only the domain/host
 *
 * Examples:
 * https://www.example.com/ -> example.com
 * https://sub.example.com/page1 -> sub.example.com/...
 * https://example.com/a/b?q=1 -> example.com/...
 */
export function shortenUrl(urlStr) {
  if (!urlStr) return '';
  try {
    const url = new URL(urlStr);
    let host = url.host; // includes host and optional port
    if (host.toLowerCase().startsWith('www.')) {
      host = host.substring(4);
    }
    const hasPath = (url.pathname && url.pathname !== '/') || url.search || url.hash;
    return hasPath ? `${host}/...` : host;
  } catch (e) {
    // Regex fallback for non-standard or malformed URLs
    let clean = urlStr.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    const slashIdx = clean.indexOf('/');
    if (slashIdx !== -1) {
      const rest = clean.substring(slashIdx);
      if (rest === '/' || rest === '') {
        return clean.substring(0, slashIdx);
      }
      return `${clean.substring(0, slashIdx)}/...`;
    }
    return clean;
  }
}

/**
 * Renders plain text with safe <a> elements for any URLs, displaying shortened labels.
 */
export function renderTextWithLinks(text) {
  if (!text) return '';
  const regex = /(https?:\/\/[^\s<>"'`]+)/gi;
  const parts = text.split(regex);

  return parts.map(part => {
    if (!part) return '';
    if (part.match(/^https?:\/\//i)) {
      let fullUrl = part;
      let trailing = '';
      const punctMatch = fullUrl.match(/([.,!?:;)]+)$/);
      if (punctMatch) {
        trailing = punctMatch[1];
        fullUrl = fullUrl.slice(0, -trailing.length);
      }
      const shortText = shortenUrl(fullUrl);
      return `<a href="${escapeHtml(fullUrl)}" class="note-link shortened-link" target="_blank" rel="noopener noreferrer" title="${escapeHtml(fullUrl)}">${escapeHtml(shortText)}</a>${escapeHtml(trailing)}`;
    }
    return escapeHtml(part);
  }).join('');
}

/**
 * Creates a DOM <a> element for a shortened link.
 */
export function createShortenedLinkElement(url) {
  const a = document.createElement('a');
  a.href = url;
  a.className = 'note-link shortened-link';
  a.contentEditable = 'false';
  a.setAttribute('data-url', url);
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.title = url;
  a.textContent = shortenUrl(url);
  return a;
}

/**
 * Creates a DOM <a> element for an expanded link.
 */
export function createExpandedLinkElement(url) {
  const a = document.createElement('a');
  a.href = url;
  a.className = 'note-link expanded-link';
  a.contentEditable = 'true';
  a.setAttribute('data-url', url);
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.title = url;
  a.textContent = url;
  return a;
}

/**
 * Extracts plain text with full URLs from a contenteditable container.
 */
export function getEditorPlainText(container) {
  if (!container) return '';

  let text = '';
  function traverse(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName === 'A') {
        const url = node.classList.contains('expanded-link')
          ? (node.textContent || node.getAttribute('data-url') || node.href)
          : (node.getAttribute('data-url') || node.href || node.textContent);
        text += url;
      } else if (node.tagName === 'BR') {
        text += '\n';
      } else {
        const isBlock = /^(DIV|P|LI|TR|H[1-6])$/i.test(node.tagName);
        if (isBlock && text.length > 0 && !text.endsWith('\n')) {
          text += '\n';
        }
        for (let child of node.childNodes) {
          traverse(child);
        }
      }
    }
  }

  traverse(container);
  return text;
}

/**
 * Sets plain text content into a container, converting URLs into shortened <a> elements.
 */
export function setEditorPlainText(container, text) {
  if (!container) return;
  container.innerHTML = '';
  if (!text) return;

  const regex = /(https?:\/\/[^\s<>"'`]+)/gi;
  const lines = text.split('\n');

  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) {
      container.appendChild(document.createElement('br'));
    }

    const parts = line.split(regex);
    parts.forEach(part => {
      if (!part) return;
      if (part.match(/^https?:\/\//i)) {
        let fullUrl = part;
        let trailing = '';
        const punctMatch = fullUrl.match(/([.,!?:;)]+)$/);
        if (punctMatch) {
          trailing = punctMatch[1];
          fullUrl = fullUrl.slice(0, -trailing.length);
        }
        const a = createShortenedLinkElement(fullUrl);
        container.appendChild(a);
        if (trailing) {
          container.appendChild(document.createTextNode(trailing));
        }
      } else {
        container.appendChild(document.createTextNode(part));
      }
    });
  });
}

let linkPillContainer = null;
let linkPillChip = null;
let currentActiveLink = null;

/**
 * Ensures the singleton floating 'Open link' pill element exists in the DOM.
 */
export function ensureLinkPill() {
  if (linkPillContainer && document.body.contains(linkPillContainer)) {
    return { container: linkPillContainer, chip: linkPillChip };
  }

  linkPillContainer = document.createElement('div');
  linkPillContainer.className = 'link-open-pill';
  linkPillContainer.setAttribute('role', 'tooltip');
  linkPillContainer.setAttribute('aria-hidden', 'true');

  linkPillChip = document.createElement('md-chip');
  linkPillChip.className = 'link-pill-chip';
  linkPillChip.setAttribute('variant', 'assist');
  linkPillChip.setAttribute('icon', 'open_in_new');
  linkPillChip.setAttribute('label', 'Open link');
  linkPillChip.setAttribute('title', 'Open link in new tab');

  // Prevent mousedown from stealing focus or moving caret inside contenteditable
  linkPillContainer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  const handleOpenLink = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentActiveLink) {
      let url = currentActiveLink.getAttribute('data-url') || currentActiveLink.textContent.trim() || currentActiveLink.href;
      if (url) {
        if (!/^https?:\/\//i.test(url)) {
          url = 'https://' + url;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  linkPillChip.addEventListener('click', handleOpenLink);
  linkPillContainer.addEventListener('click', handleOpenLink);

  linkPillContainer.appendChild(linkPillChip);
  document.body.appendChild(linkPillContainer);

  return { container: linkPillContainer, chip: linkPillChip };
}

/**
 * Updates the floating pill position directly underneath the active expanded link.
 */
export function updateLinkPillPosition() {
  if (!currentActiveLink || !linkPillContainer || !linkPillContainer.classList.contains('visible')) {
    return;
  }

  if (!currentActiveLink.isConnected || !document.body.contains(currentActiveLink)) {
    hideLinkPill();
    return;
  }

  const rects = currentActiveLink.getClientRects();
  const rect = rects && rects.length > 0 ? rects[rects.length - 1] : currentActiveLink.getBoundingClientRect();

  // Check if link is outside viewport
  if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
    hideLinkPill();
    return;
  }

  const pillRect = linkPillContainer.getBoundingClientRect();
  const pillHeight = pillRect.height || 36;
  const pillWidth = pillRect.width || 120;

  let top = rect.bottom + 6;
  // If overflowing bottom of window, flip to above the link
  if (top + pillHeight > window.innerHeight - 8) {
    top = Math.max(8, rect.top - pillHeight - 6);
  }

  let left = rect.left;
  // Keep within screen horizontally
  if (left + pillWidth > window.innerWidth - 12) {
    left = Math.max(12, window.innerWidth - pillWidth - 12);
  }
  if (left < 12) {
    left = 12;
  }

  linkPillContainer.style.top = `${Math.round(top)}px`;
  linkPillContainer.style.left = `${Math.round(left)}px`;
}

/**
 * Shows the 'Open link' pill underneath the specified expanded link element.
 */
export function showLinkPill(linkEl) {
  if (!linkEl) {
    hideLinkPill();
    return;
  }

  currentActiveLink = linkEl;
  const { container } = ensureLinkPill();

  container.setAttribute('aria-hidden', 'false');
  container.classList.add('visible');

  updateLinkPillPosition();
  requestAnimationFrame(updateLinkPillPosition);
}

/**
 * Hides the 'Open link' pill.
 */
export function hideLinkPill() {
  currentActiveLink = null;
  if (linkPillContainer) {
    linkPillContainer.classList.remove('visible');
    linkPillContainer.setAttribute('aria-hidden', 'true');
  }
}

// Global window event listeners for smooth pill tracking
if (typeof window !== 'undefined') {
  window.addEventListener('scroll', updateLinkPillPosition, { capture: true, passive: true });
  window.addEventListener('resize', updateLinkPillPosition, { passive: true });
}

/**
 * Collapses all expanded links, optionally excluding an active link being expanded.
 */
function collapseExpandedLinks(activeLink = null) {
  const sel = window.getSelection();
  const expandedLinks = document.querySelectorAll('a.expanded-link');
  for (let linkEl of expandedLinks) {
    if (linkEl === activeLink) continue;
    if (activeLink || !isSelectionTouchingNode(sel, linkEl)) {
      const currentText = linkEl.textContent.trim();
      if (/^https?:\/\/[^\s<>"'`]+/i.test(currentText)) {
        linkEl.href = currentText;
        linkEl.setAttribute('data-url', currentText);
        linkEl.textContent = shortenUrl(currentText);
        linkEl.contentEditable = 'false';
        linkEl.classList.remove('expanded-link');
        linkEl.classList.add('shortened-link');
        linkEl.title = currentText;
      } else {
        // No longer a valid URL -> convert to text node
        const textNode = document.createTextNode(linkEl.textContent);
        if (linkEl.parentNode) {
          linkEl.parentNode.replaceChild(textNode, linkEl);
        }
      }
      if (linkEl === currentActiveLink) {
        hideLinkPill();
      }
    }
  }
}

/**
 * Helper to check if selection is inside or adjacent to a given node
 */
function isSelectionTouchingNode(sel, targetNode) {
  if (!sel || sel.rangeCount === 0 || !targetNode) return false;
  const range = sel.getRangeAt(0);

  // Direct match
  if (range.startContainer === targetNode || range.endContainer === targetNode) return true;
  if (targetNode.contains(range.startContainer) || targetNode.contains(range.endContainer)) return true;

  // Check sibling adjacency in parent
  const parent = targetNode.parentNode;
  if (parent && (range.startContainer === parent || range.endContainer === parent)) {
    const idx = Array.prototype.indexOf.call(parent.childNodes, targetNode);
    if (range.startContainer === parent && (range.startOffset === idx || range.startOffset === idx + 1)) return true;
    if (range.endContainer === parent && (range.endOffset === idx || range.endOffset === idx + 1)) return true;
  }

  // Check boundary adjacency for text node siblings
  if (targetNode.previousSibling && targetNode.previousSibling.nodeType === Node.TEXT_NODE) {
    if (range.startContainer === targetNode.previousSibling && range.startOffset === targetNode.previousSibling.length) {
      return true;
    }
  }
  if (targetNode.nextSibling && targetNode.nextSibling.nodeType === Node.TEXT_NODE) {
    if (range.startContainer === targetNode.nextSibling && range.startOffset === 0) {
      return true;
    }
  }

  return false;
}

/**
 * Attaches rich link expansion/collapse handling to a contenteditable note editor container.
 */
export function attachRichLinkEditor(editorElement) {
  if (!editorElement || editorElement._hasRichLinkEditor) return;
  editorElement._hasRichLinkEditor = true;

  editorElement.contentEditable = 'true';
  editorElement.classList.add('note-editor-body');

  let isUpdating = false;

  // Polyfill .value property getter/setter for compatibility with standard textareas
  Object.defineProperty(editorElement, 'value', {
    get() {
      return getEditorPlainText(editorElement);
    },
    set(val) {
      setEditorPlainText(editorElement, val || '');
    },
    configurable: true
  });

  // Polyfill .placeholder property
  Object.defineProperty(editorElement, 'placeholder', {
    get() {
      return editorElement.getAttribute('data-placeholder') || '';
    },
    set(val) {
      editorElement.setAttribute('data-placeholder', val || '');
    },
    configurable: true
  });

  // Polyfill .readOnly property
  Object.defineProperty(editorElement, 'readOnly', {
    get() {
      return editorElement.contentEditable === 'false';
    },
    set(val) {
      editorElement.contentEditable = val ? 'false' : 'true';
    },
    configurable: true
  });

  /**
   * Expands an <a> link element so its text becomes the full URL while remaining an <a> tag.
   */
  function expandLink(linkEl, cursorOffset = null) {
    collapseExpandedLinks(linkEl);

    const fullUrl = linkEl.getAttribute('data-url') || linkEl.href;
    if (!fullUrl) return;

    linkEl.textContent = fullUrl;
    linkEl.contentEditable = 'true';
    linkEl.classList.remove('shortened-link');
    linkEl.classList.add('expanded-link');
    linkEl.title = fullUrl;

    const textNode = linkEl.firstChild;
    if (textNode) {
      const sel = window.getSelection();
      if (sel) {
        const newRange = document.createRange();
        const targetOffset = cursorOffset !== null ? Math.min(cursorOffset, textNode.length) : textNode.length;
        newRange.setStart(textNode, targetOffset);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    }

    showLinkPill(linkEl);
  }

  /**
   * Collapses an expanded <a> tag or wraps plain text URLs into <a> tags when caret is away.
   */
  function collapseInactiveLinks() {
    if (isUpdating) return;
    isUpdating = true;

    try {
      const sel = window.getSelection();

      // 1. Collapse all expanded links where selection is not touching
      collapseExpandedLinks(null);

      // 2. Scan text nodes for URLs not in <a> tags and convert them to shortened <a> tags
      const textNodes = [];
      function collectTextNodes(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          textNodes.push(node);
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'A') {
          for (let child of node.childNodes) {
            collectTextNodes(child);
          }
        }
      }

      collectTextNodes(editorElement);

      for (let textNode of textNodes) {
        const text = textNode.textContent;
        const match = /https?:\/\/[^\s<>"'`]+/gi.exec(text);
        if (match) {
          const matchIndex = match.index;
          let fullUrl = match[0];
          let trailing = '';
          const punctMatch = fullUrl.match(/([.,!?:;)]+)$/);
          if (punctMatch) {
            trailing = punctMatch[1];
            fullUrl = fullUrl.slice(0, -trailing.length);
          }

          let isTouching = false;
          if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
            const range = sel.getRangeAt(0);
            if (range.startContainer === textNode) {
              const pos = range.startOffset;
              if (pos >= matchIndex && pos <= matchIndex + fullUrl.length) {
                isTouching = true;
              }
            }
          }

          if (!isTouching) {
            const before = text.substring(0, matchIndex);
            const after = text.substring(matchIndex + fullUrl.length);

            const parent = textNode.parentNode;
            if (parent) {
              const a = createShortenedLinkElement(fullUrl);
              const frag = document.createDocumentFragment();

              if (before) frag.appendChild(document.createTextNode(before));
              frag.appendChild(a);
              if (after) frag.appendChild(document.createTextNode(after));

              parent.replaceChild(frag, textNode);
            }
          }
        }
      }
    } finally {
      isUpdating = false;
    }
  }

  /**
   * Check if caret is on a link to expand, or away from a link to collapse
   */
  function handleCaretChange() {
    if (isUpdating) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    // 1. Check if a shortened <a> element should be expanded
    const shortenedLinks = editorElement.querySelectorAll('a.shortened-link');
    for (let linkEl of shortenedLinks) {
      if (isSelectionTouchingNode(sel, linkEl)) {
        expandLink(linkEl);
        return;
      }
    }

    // 2. Check if an expanded link is currently active
    const expandedLinks = editorElement.querySelectorAll('a.expanded-link');
    let hasActiveExpandedLink = false;
    for (let linkEl of expandedLinks) {
      if (isSelectionTouchingNode(sel, linkEl)) {
        hasActiveExpandedLink = true;
        showLinkPill(linkEl);
        break;
      }
    }

    if (!hasActiveExpandedLink && currentActiveLink && editorElement.contains(currentActiveLink)) {
      hideLinkPill();
    }

    // 3. Collapse any URLs not being edited
    collapseInactiveLinks();
  }

  // Live update href when user edits text inside an expanded <a> link
  editorElement.addEventListener('input', (e) => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const node = sel.anchorNode;
      const linkEl = node?.nodeType === Node.ELEMENT_NODE ? node.closest('a') : node?.parentElement?.closest('a');
      if (linkEl && linkEl.classList.contains('expanded-link')) {
        const text = linkEl.textContent;
        linkEl.href = text;
        linkEl.setAttribute('data-url', text);
        linkEl.title = text;
        updateLinkPillPosition();
      }
    }
  });

  // Event Listeners
  editorElement.addEventListener('click', (e) => {
    const linkEl = e.target.closest('a.shortened-link');
    if (linkEl && editorElement.contains(linkEl)) {
      e.preventDefault();
      expandLink(linkEl);
    } else {
      setTimeout(handleCaretChange, 10);
    }
  });

  editorElement.addEventListener('keyup', (e) => {
    handleCaretChange();
  });

  editorElement.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      setTimeout(handleCaretChange, 10);
    }
  });

  // Listen to document selection changes when focus is inside the editor
  const onSelectionChange = () => {
    if (document.activeElement === editorElement || editorElement.contains(document.activeElement)) {
      handleCaretChange();
    }
  };
  document.addEventListener('selectionchange', onSelectionChange);

  editorElement.addEventListener('blur', () => {
    collapseInactiveLinks();
    setTimeout(() => {
      if (document.activeElement !== editorElement && !editorElement.contains(document.activeElement)) {
        if (!linkPillContainer || !linkPillContainer.contains(document.activeElement)) {
          hideLinkPill();
        }
      }
    }, 150);
  });

  // Handle Paste
  editorElement.addEventListener('paste', (e) => {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData('text/plain');
    if (!pastedText) return;

    collapseExpandedLinks(null);

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();

      // If pasting a single standalone URL, paste directly as an expanded <a> link
      if (/^https?:\/\/[^\s<>"'`]+$/i.test(pastedText.trim())) {
        const url = pastedText.trim();
        const a = createExpandedLinkElement(url);
        range.insertNode(a);

        // Position cursor inside or right after
        range.setStartAfter(a);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);

        showLinkPill(a);
      } else {
        const textNode = document.createTextNode(pastedText);
        range.insertNode(textNode);

        range.setStartAfter(textNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }

      setTimeout(collapseInactiveLinks, 10);
      editorElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
}

