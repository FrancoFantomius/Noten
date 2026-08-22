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

/**
 * Opens the fullscreen image lightbox.
 */
export function openLightbox(src, name = '') {
  elements.lightboxImage.src = src;

  let displayName = name;
  if (!displayName) {
    if (src && !src.startsWith('data:')) {
      const parts = src.split('/');
      displayName = parts[parts.length - 1]?.split('?')[0] || '';
    } else {
      displayName = 'image.jpg';
    }
  }

  if (elements.lightboxFilename) {
    elements.lightboxFilename.textContent = displayName;
  }

  elements.lightboxModal.classList.add('active');
  elements.lightboxModal.classList.remove('hidden');
}

/**
 * Closes the fullscreen image lightbox.
 */
export function closeLightbox() {
  elements.lightboxModal.classList.remove('active');
  setTimeout(() => {
    if (!elements.lightboxModal.classList.contains('active')) {
      elements.lightboxModal.classList.add('hidden');
      elements.lightboxImage.src = '';
      if (elements.lightboxFilename) {
        elements.lightboxFilename.textContent = '';
      }
    }
  }, 200);
}

/**
 * Attaches reliable click/tap handling to an md-carousel for its items,
 * preventing pointer capture in md-carousel from swallowing click events
 * while properly distinguishing between swipes/drags and intentional clicks.
 */
export function setupCarouselItemClicks(carousel, onItemClick) {
  if (!carousel) return;

  let startX = 0;
  let startY = 0;
  let startTarget = null;
  let startTime = 0;

  carousel.addEventListener('pointerdown', (e) => {
    startX = e.clientX;
    startY = e.clientY;
    startTime = Date.now();
    const path = e.composedPath ? e.composedPath() : [e.target];
    startTarget = path.find(el => el && el.tagName === 'MD-CAROUSEL-ITEM') || null;
  }, { capture: true });

  carousel.addEventListener('pointerup', (e) => {
    const diffX = Math.abs(e.clientX - startX);
    const diffY = Math.abs(e.clientY - startY);
    const duration = Date.now() - startTime;

    // Movement must be small (within tap threshold) and quick (not a long drag)
    if (diffX < 12 && diffY < 12 && duration < 600) {
      const elAtPoint = document.elementFromPoint(e.clientX, e.clientY);
      const isRemoveBtn = elAtPoint?.closest('.btn-remove-image') || (e.composedPath ? e.composedPath().some(el => el && el.classList && el.classList.contains('btn-remove-image')) : false);
      if (isRemoveBtn) return;

      const isControlBtn = elAtPoint?.closest('.control-button') || elAtPoint?.closest('.indicator-dot');
      if (isControlBtn) return;

      const item = elAtPoint?.closest('md-carousel-item') || startTarget;
      if (item) {
        const src = item.getAttribute('src') || item.src;
        const name = item.getAttribute('alt') || item.getAttribute('name') || '';
        if (src) {
          e.stopPropagation();
          onItemClick(src, item, name);
        }
      }
    }
  });

  carousel.addEventListener('click', (e) => {
    const path = e.composedPath ? e.composedPath() : [e.target];
    if (path.some(el => el && el.classList && el.classList.contains('btn-remove-image'))) return;
    if (path.some(el => el && el.classList && (el.classList.contains('control-button') || el.classList.contains('indicator-dot')))) return;

    const item = path.find(el => el && el.tagName === 'MD-CAROUSEL-ITEM') || document.elementFromPoint(e.clientX, e.clientY)?.closest('md-carousel-item');
    if (item) {
      const src = item.getAttribute('src') || item.src;
      const name = item.getAttribute('alt') || item.getAttribute('name') || '';
      if (src) {
        e.stopPropagation();
        onItemClick(src, item, name);
      }
    }
  });

  carousel.addEventListener('carousel-item-click', (e) => {
    const path = e.composedPath ? e.composedPath() : [e.target];
    if (path.some(el => el && el.classList && el.classList.contains('btn-remove-image'))) return;
    const item = e.detail?.item || e.target;
    const src = item?.getAttribute?.('src') || item?.src;
    const name = item?.getAttribute?.('alt') || item?.getAttribute?.('name') || '';
    if (src) {
      e.stopPropagation();
      onItemClick(src, item, name);
    }
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

  const isSingle = images.length === 1;
  const carousel = document.createElement('md-carousel');
  carousel.setAttribute('layout', isSingle ? 'full-width' : 'multi-browse');
  carousel.setAttribute('item-height', '240px');
  carousel.setAttribute('aria-label', 'Attached note images');

  images.forEach((img, index) => {
    const imgSrc = getImageSrc(img);
    if (!imgSrc) return;

    const item = document.createElement('md-carousel-item');
    item.setAttribute('src', imgSrc);
    item.setAttribute('alt', `image-${index + 1}.jpg`);
    item.setAttribute('interactive', '');

    if (isEditable) {
      const removeBtn = document.createElement('md-icon-button');
      removeBtn.className = 'btn-remove-image';
      removeBtn.setAttribute('variant', 'filled');
      removeBtn.setAttribute('icon', 'close');
      removeBtn.setAttribute('title', t('btn_remove_image_title'));
      removeBtn.setAttribute('aria-label', t('btn_remove_image_title'));
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onRemove(index);
      });
      item.appendChild(removeBtn);
    }

    carousel.appendChild(item);
  });

  setupCarouselItemClicks(carousel, (src, item, name) => {
    openLightbox(src, name);
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
