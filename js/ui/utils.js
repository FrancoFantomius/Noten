/**
 * Noten UI - Utility Functions
 */

import { t, getLanguage } from '../i18n.js';
import { elements } from './state.js';

/**
 * Escapes HTML characters in text to prevent XSS
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

/**
 * Formats timestamps to friendly dates
 */
export function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const lang = getLanguage();

  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  }

  const isThisYear = date.getFullYear() === now.getFullYear();
  if (isThisYear) {
    return date.toLocaleDateString(lang, { month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Extracts raw image source URL from string or image object
 */
export function getImageSrc(img) {
  if (!img) return '';
  if (typeof img === 'string') return img;
  return img.url || img.data || img.src || '';
}

/**
 * Checks if an image has the optimized tag
 */
export function isImageOptimized(img) {
  return typeof img === 'object' && img !== null && Boolean(img.optimized);
}

/**
 * Compress image using Canvas API (supports File, Blob, or base64 string)
 */
export function compressImage(fileOrSrc) {
  return new Promise((resolve, reject) => {
    const processImageSrc = (src) => {
      const img = new Image();
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
      img.src = src;
    };

    if (typeof fileOrSrc === 'string') {
      processImageSrc(fileOrSrc);
    } else if (fileOrSrc instanceof Blob || (typeof File !== 'undefined' && fileOrSrc instanceof File)) {
      const reader = new FileReader();
      reader.onload = (e) => processImageSrc(e.target.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(fileOrSrc);
    } else {
      reject(new Error('Invalid image input: expected File, Blob, or Data URL string'));
    }
  });
}

/**
 * Optimizes an image item if it is not already tagged as optimized
 */
export async function optimizeImageItem(img) {
  if (isImageOptimized(img)) {
    return {
      url: getImageSrc(img),
      optimized: true
    };
  }
  const src = getImageSrc(img);
  if (!src) return null;
  const compressed = await compressImage(src);
  return {
    url: compressed,
    optimized: true
  };
}

let currentLightboxImages = [];
let currentLightboxIndex = 0;
let currentLightboxOnDelete = null;

function renderLightboxCurrentItem() {
  if (currentLightboxImages.length === 0) {
    closeLightbox();
    return;
  }

  const currentItem = currentLightboxImages[currentLightboxIndex];
  const src = getImageSrc(currentItem);
  if (elements.lightboxImage) {
    elements.lightboxImage.src = src;
  }

  let displayName = '';
  if (typeof currentItem === 'object' && currentItem.alt) {
    displayName = currentItem.alt;
  } else if (src && !src.startsWith('data:')) {
    const parts = src.split('/');
    displayName = parts[parts.length - 1]?.split('?')[0] || '';
  } else {
    displayName = `image-${currentLightboxIndex + 1}.jpg`;
  }

  if (elements.lightboxFilename) {
    elements.lightboxFilename.textContent = displayName;
  }

  // Update navigation buttons visibility (first image has no previous, last has no next)
  const hasMultiple = currentLightboxImages.length > 1;
  const hasPrev = hasMultiple && currentLightboxIndex > 0;
  const hasNext = hasMultiple && currentLightboxIndex < currentLightboxImages.length - 1;

  if (elements.btnLightboxPrev) {
    elements.btnLightboxPrev.classList.toggle('hidden', !hasPrev);
  }
  if (elements.btnLightboxNext) {
    elements.btnLightboxNext.classList.toggle('hidden', !hasNext);
  }

  // Update indicators (Image 2 style)
  if (elements.lightboxIndicators) {
    if (hasMultiple) {
      elements.lightboxIndicators.classList.remove('hidden');
      elements.lightboxIndicators.innerHTML = '';
      currentLightboxImages.forEach((_, idx) => {
        const dot = document.createElement('button');
        dot.className = `lightbox-indicator-dot ${idx === currentLightboxIndex ? 'active' : ''}`;
        dot.setAttribute('aria-label', `Go to image ${idx + 1}`);
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          goToLightboxIndex(idx);
        });
        elements.lightboxIndicators.appendChild(dot);
      });
    } else {
      elements.lightboxIndicators.classList.add('hidden');
      elements.lightboxIndicators.innerHTML = '';
    }
  }
}

/**
 * Navigates to a specific image index in the lightbox.
 */
export function goToLightboxIndex(index) {
  if (currentLightboxImages.length === 0) return;
  if (index < 0 || index >= currentLightboxImages.length) return;
  currentLightboxIndex = index;
  renderLightboxCurrentItem();
}

/**
 * Navigates to the next image in the lightbox.
 */
export function nextLightboxImage() {
  if (currentLightboxIndex < currentLightboxImages.length - 1) {
    goToLightboxIndex(currentLightboxIndex + 1);
  }
}

/**
 * Navigates to the previous image in the lightbox.
 */
export function prevLightboxImage() {
  if (currentLightboxIndex > 0) {
    goToLightboxIndex(currentLightboxIndex - 1);
  }
}

/**
 * Opens the fullscreen image lightbox.
 */
export function openLightbox(src, name = '', onDelete = null, images = [], activeIndex = 0) {
  currentLightboxOnDelete = typeof onDelete === 'function' ? onDelete : null;

  if (images && images.length > 0) {
    currentLightboxImages = [...images];
    currentLightboxIndex = activeIndex >= 0 && activeIndex < images.length ? activeIndex : 0;
  } else if (src) {
    currentLightboxImages = [{ url: src, alt: name }];
    currentLightboxIndex = 0;
  } else {
    currentLightboxImages = [];
    currentLightboxIndex = 0;
  }

  if (elements.btnLightboxDelete) {
    if (currentLightboxOnDelete) {
      elements.btnLightboxDelete.classList.remove('hidden');
    } else {
      elements.btnLightboxDelete.classList.add('hidden');
    }
  }

  renderLightboxCurrentItem();

  elements.lightboxModal.classList.add('active');
  elements.lightboxModal.classList.remove('hidden');
}

/**
 * Closes the fullscreen image lightbox.
 */
export function closeLightbox() {
  elements.lightboxModal.classList.remove('active');
  currentLightboxOnDelete = null;
  currentLightboxImages = [];
  currentLightboxIndex = 0;
  if (elements.btnLightboxDownload) elements.btnLightboxDownload.selected = false;
  if (elements.btnLightboxDelete) elements.btnLightboxDelete.selected = false;
  if (elements.btnLightboxClose) elements.btnLightboxClose.selected = false;
  setTimeout(() => {
    if (!elements.lightboxModal.classList.contains('active')) {
      elements.lightboxModal.classList.add('hidden');
      if (elements.lightboxImage) elements.lightboxImage.src = '';
      if (elements.lightboxFilename) elements.lightboxFilename.textContent = '';
      if (elements.lightboxIndicators) elements.lightboxIndicators.innerHTML = '';
    }
  }, 200);
}

/**
 * Downloads the image currently displayed in the fullscreen lightbox.
 */
export function downloadLightboxImage() {
  const src = elements.lightboxImage?.src;
  if (!src) return;

  const filename = elements.lightboxFilename?.textContent || 'image.jpg';
  const a = document.createElement('a');
  a.href = src;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Triggers deletion of the image currently opened in lightbox.
 */
export async function triggerLightboxDelete() {
  if (currentLightboxOnDelete) {
    const deletedIndex = currentLightboxIndex;
    const deletedItem = currentLightboxImages[deletedIndex];
    const handler = currentLightboxOnDelete;

    await handler(deletedIndex, getImageSrc(deletedItem));

    currentLightboxImages.splice(deletedIndex, 1);
    if (currentLightboxImages.length === 0) {
      closeLightbox();
    } else {
      if (currentLightboxIndex >= currentLightboxImages.length) {
        currentLightboxIndex = currentLightboxImages.length - 1;
      }
      renderLightboxCurrentItem();
    }
  }
}

/**
 * Attaches reliable click/tap handling to an md-carousel for its items,
 * preventing pointer capture in md-carousel from swallowing click events
 * while properly distinguishing between swipes/drags/scrolls and intentional clicks.
 */
export function setupCarouselItemClicks(carousel, onItemClick) {
  if (!carousel) return;

  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let isDragOrScroll = false;
  let lastScrollTime = 0;
  let lastTriggerTime = 0;

  const onScroll = () => {
    lastScrollTime = Date.now();
    isDragOrScroll = true;
  };

  carousel.addEventListener('scroll', onScroll, { capture: true, passive: true });
  carousel.addEventListener('wheel', onScroll, { capture: true, passive: true });
  carousel.addEventListener('touchmove', () => { isDragOrScroll = true; }, { capture: true, passive: true });

  carousel.addEventListener('pointerdown', (e) => {
    startX = e.clientX;
    startY = e.clientY;
    startTime = Date.now();
    isDragOrScroll = false;
  }, { capture: true });

  carousel.addEventListener('pointermove', (e) => {
    if (startTime > 0) {
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx > 6 || dy > 6) {
        isDragOrScroll = true;
      }
    }
  }, { capture: true });

  carousel.addEventListener('pointerup', () => {
    if (startTime > 0 && Date.now() - startTime > 600) {
      isDragOrScroll = true;
    }
  }, { capture: true });

  const handleActivation = (e, targetItem = null) => {
    const path = e.composedPath ? e.composedPath() : [e.target];
    if (path.some(el => el && el.classList && (
      el.classList.contains('btn-remove-image') ||
      el.classList.contains('control-button') ||
      el.classList.contains('indicator-dot') ||
      el.tagName === 'MD-ICON-BUTTON'
    ))) {
      return;
    }

    const isRecentScroll = Date.now() - lastScrollTime < 300;
    if (isDragOrScroll || isRecentScroll) {
      return;
    }

    if (Date.now() - lastTriggerTime < 350) {
      return;
    }

    const item = targetItem || path.find(el => el && el.tagName === 'MD-CAROUSEL-ITEM') || document.elementFromPoint(e.clientX, e.clientY)?.closest('md-carousel-item');
    if (!item) return;

    const imgEl = item.querySelector('img');
    const src = item.getAttribute('src') || item.src || imgEl?.src || imgEl?.getAttribute('src');
    const name = item.getAttribute('alt') || item.getAttribute('name') || imgEl?.getAttribute('alt') || '';

    if (src) {
      lastTriggerTime = Date.now();
      e.stopPropagation();
      e.preventDefault();
      onItemClick(src, item, name);
    }
  };

  carousel.addEventListener('carousel-item-click', (e) => {
    const item = e.detail?.item || e.target;
    handleActivation(e, item);
  });

  carousel.addEventListener('click', (e) => {
    handleActivation(e);
  });
}

/**
 * Renders interactive Material 3 image carousel dynamically inside a DOM container.
 */
export function renderImageGrid(container, images, isEditable, onRemove) {
  if (!container) return;

  container.innerHTML = '';
  if (!images || images.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');

  const carousel = document.createElement('md-carousel');
  carousel.setAttribute('layout', 'uncontained');
  carousel.setAttribute('item-height', '240px');
  carousel.setAttribute('aria-label', 'Attached note images');

  images.forEach((img, index) => {
    const imgSrc = getImageSrc(img);
    if (!imgSrc) return;

    const item = document.createElement('md-carousel-item');
    item.setAttribute('interactive', '');

    const imgEl = document.createElement('img');
    imgEl.setAttribute('slot', 'media');
    imgEl.setAttribute('src', imgSrc);
    imgEl.setAttribute('alt', `image-${index + 1}.jpg`);
    imgEl.setAttribute('loading', 'lazy');
    item.appendChild(imgEl);

    carousel.appendChild(item);
  });

  setupCarouselItemClicks(carousel, (src, item, name) => {
    let onDelete = null;
    const clickedIndex = images.findIndex(img => getImageSrc(img) === src);
    if (isEditable && typeof onRemove === 'function') {
      onDelete = (delIndex) => {
        const targetIdx = delIndex !== undefined ? delIndex : clickedIndex;
        if (targetIdx !== -1) {
          onRemove(targetIdx);
        }
      };
    }
    openLightbox(src, name, onDelete, images, clickedIndex >= 0 ? clickedIndex : 0);
  });

  container.appendChild(carousel);
}

export const renderImageCarousel = renderImageGrid;

/**
 * Displays a Material 3 snackbar notification
 * @param {string} message - Message text
 * @param {Object} [options] - Options like actionText, onAction, timeoutMs
 */
export function showSnackbar(message, options = {}) {
  const snackbar = elements.appSnackbar || document.getElementById('app-snackbar');
  if (!snackbar) return;

  snackbar.message = message;
  snackbar.actionText = options.actionText || '';
  snackbar.closeable = options.closeable !== undefined ? options.closeable : true;
  if (options.timeoutMs !== undefined) {
    snackbar.timeoutMs = options.timeoutMs;
  }

  if (options.onAction) {
    const handleAction = () => {
      options.onAction();
      snackbar.removeEventListener('action', handleAction);
    };
    snackbar.addEventListener('action', handleAction, { once: true });
  }

  snackbar.show();
}

/**
 * Prompts the user with a confirmation md-dialog before permanently deleting a note
 * @returns {Promise<boolean>} Resolves to true if user confirmed, false otherwise
 */
export function showDeleteConfirmDialog() {
  return new Promise((resolve) => {
    const dialog = elements.deleteConfirmDialog || document.getElementById('delete-confirm-dialog');
    if (!dialog) {
      resolve(false);
      return;
    }

    const cancelBtn = elements.btnDeleteConfirmCancel || document.getElementById('btn-delete-confirm-cancel');
    const acceptBtn = elements.btnDeleteConfirmAccept || document.getElementById('btn-delete-confirm-accept');

    let isResolved = false;

    const cleanup = () => {
      if (acceptBtn) acceptBtn.removeEventListener('click', onAccept);
      if (cancelBtn) cancelBtn.removeEventListener('click', onCancel);
      dialog.removeEventListener('close', onClose);
    };

    const finish = (result) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      resolve(result);
    };

    const onAccept = () => {
      dialog.close('accept');
      finish(true);
    };

    const onCancel = () => {
      dialog.close('cancel');
      finish(false);
    };

    const onClose = (e) => {
      finish(e.detail?.returnValue === 'accept');
    };

    if (acceptBtn) acceptBtn.addEventListener('click', onAccept);
    if (cancelBtn) cancelBtn.addEventListener('click', onCancel);
    dialog.addEventListener('close', onClose);

    dialog.showModal();
  });
}
