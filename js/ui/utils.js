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
 * Compress image using Canvas API
 */
export function compressImage(file) {
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

/**
 * Opens the fullscreen image lightbox.
 */
export function openLightbox(src) {
  elements.lightboxImage.src = src;
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
    }
  }, 200);
}

/**
 * Renders interactive responsive image grid dynamically inside a DOM container.
 */
export function renderImageGrid(container, images, isEditable, onRemove) {
  if (!container) return;

  container.innerHTML = '';
  if (!images || images.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');

  const row = document.createElement('div');
  row.className = 'image-grid-row';

  const numCols = Math.min(images.length, 4);
  const cols = Array.from({ length: numCols }, () => {
    const col = document.createElement('div');
    col.className = 'image-grid-column';
    return col;
  });

  images.forEach((imgSrc, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'grid-image-wrapper';

    const img = document.createElement('img');
    img.src = imgSrc;
    img.alt = `Attached image ${index + 1}`;
    img.style.cursor = 'pointer';
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      openLightbox(imgSrc);
    });
    wrapper.appendChild(img);

    if (isEditable) {
      const btn = document.createElement('button');
      btn.className = 'btn-remove-image';
      btn.setAttribute('data-index', index);
      btn.title = t('btn_remove_image_title');
      btn.innerHTML = '<i data-lucide="x"></i>';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onRemove(index);
      });
      wrapper.appendChild(btn);
    }

    cols[index % numCols].appendChild(wrapper);
  });

  cols.forEach(col => row.appendChild(col));
  container.appendChild(row);

  if (window.lucide) {
    window.lucide.createIcons();
  }
}
