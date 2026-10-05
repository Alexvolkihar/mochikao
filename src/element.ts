import { CONTINUOUS_AXES, mochikao, mochikaoImage, rendersAsImage, type ShapeFamily } from './index.ts';
import { morphTo } from './morph.ts';
import { parseParams } from './params.ts';

const ATTRS = [
  'name', 'size', 'background', 'hue', 'tone', 'saturation', 'color', 'expression', 'animate',
  'family', 'shape', 'eyes', 'mouth', 'extra', 'gaze', 'inline', ...CONTINUOUS_AXES,
];
const REACH = 2.6;

/**
 * <mochikao-avatar name="alex" animate="always" gaze></mochikao-avatar>
 * Avec `gaze`, les yeux suivent le pointeur. Sans animation ni `gaze`, rend un
 * simple <img> (sauf avec l'attribut `inline`).
 */
export class MochikaoAvatar extends HTMLElement {
  static observedAttributes = ATTRS;
  /** Familles utilisables via l'attribut `family` (voir defineMochikao). */
  static families: readonly ShapeFamily[] = [];

  #frame = 0;
  #onMove = (e: PointerEvent) => {
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => {
      const r = this.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const m = Math.min(1, dist / 260) * REACH;
      this.style.setProperty('--gx', ((dx / dist) * m).toFixed(2));
      this.style.setProperty('--gy', ((dy / dist) * m).toFixed(2));
    });
  };

  connectedCallback() {
    this.style.display ||= 'inline-block';
    this.style.lineHeight ||= '0';
    this.#render();
    this.#syncGaze();
  }

  disconnectedCallback() {
    window.removeEventListener('pointermove', this.#onMove);
  }

  attributeChangedCallback(attr: string) {
    if (!this.isConnected) return;
    this.#render();
    if (attr === 'gaze') this.#syncGaze();
  }

  #syncGaze() {
    window.removeEventListener('pointermove', this.#onMove);
    if (this.hasAttribute('gaze')) {
      window.addEventListener('pointermove', this.#onMove, { passive: true });
    } else {
      this.style.removeProperty('--gx');
      this.style.removeProperty('--gy');
    }
  }

  #render() {
    const options = parseParams(this.getAttribute('name') ?? '', { get: (k) => this.getAttribute(k) }, MochikaoAvatar.families);
    const full = { ...options, gaze: this.hasAttribute('gaze'), inline: this.hasAttribute('inline') };
    if (rendersAsImage(full)) {
      const img = document.createElement('img');
      Object.assign(img, mochikaoImage(options));
      img.style.verticalAlign = 'middle';
      this.replaceChildren(img);
    } else {
      morphTo(this, mochikao(full));
    }
  }
}

/**
 * Déclare <mochikao-avatar>. Les familles passées ici deviennent utilisables par
 * leur nom : `defineMochikao({ families: [animals] })` puis `family="animals"`.
 */
export function defineMochikao({ tag = 'mochikao-avatar', families = [] }: { tag?: string; families?: readonly ShapeFamily[] } = {}) {
  MochikaoAvatar.families = [...new Set([...MochikaoAvatar.families, ...families])];
  if (!customElements.get(tag)) customElements.define(tag, MochikaoAvatar);
  else for (const el of document.querySelectorAll<MochikaoAvatar>(tag)) el.attributeChangedCallback('family');
}
