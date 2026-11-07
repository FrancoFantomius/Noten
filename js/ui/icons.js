import { html } from 'lit';

let isPatched = false;

/**
 * Replaces font-based icon glyphs in md-icon with local M3 SVG assets from img/M3icons/
 */
export function initM3SvgIcons() {
  if (isPatched) return;

  function patchMdIcon(MdIcon) {
    if (!MdIcon || MdIcon._m3SvgPatched) return;
    MdIcon._m3SvgPatched = true;

    const originalRender = MdIcon.prototype.render;

    MdIcon.prototype.render = function () {
      if (!this.name) {
        return originalRender ? originalRender.call(this) : html`<slot></slot>`;
      }

      const iconUrl = `./img/M3icons/${this.name}.svg`;

      return html`<slot><span class="m3-icon-glyph" aria-hidden="true" style="display:inline-block;width:100%;height:100%;background-color:currentColor;-webkit-mask:url('${iconUrl}') no-repeat center / contain;mask:url('${iconUrl}') no-repeat center / contain;pointer-events:none;"></span></slot>`;
    };

    isPatched = true;
  }

  const existing = customElements.get('md-icon');
  if (existing) {
    patchMdIcon(existing);
  } else if (typeof customElements !== 'undefined' && customElements.whenDefined) {
    customElements.whenDefined('md-icon').then(() => {
      patchMdIcon(customElements.get('md-icon'));
    });
  }
}

// Auto-initialize upon import
initM3SvgIcons();
