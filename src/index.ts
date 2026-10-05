import { palette, type Palette } from './color.ts';
import { face } from './face.ts';
import { cyrb53 } from './random.ts';
import { isFamily, type ShapeFamily } from './family.ts';
import { blobs, buildBody, superellipsePath } from './shape.ts';
import {
  ANIMATIONS, BACKGROUNDS, COLORS, EXPRESSIONS, EXTRAS, EYES, MOUTHS,
  deriveTraits, pick, positionOf,
  type Animation, type Background, type ColorPreset, type Expression, type ExtraName,
  type EyesName, type MouthName, type Traits,
} from './traits.ts';

export * from './traits.ts';
export { blobs } from './shape.ts';
export { isFamily } from './family.ts';
export type { Decoration, ShapeDef, ShapeFamily } from './family.ts';
export { palette, contrast, hslToRgb } from './color.ts';
export type { Palette } from './color.ts';

export interface MochikaoOptions {
  /** N'importe quelle chaîne : pseudo, e-mail, id... Insensible à la casse. */
  name: string;
  /** Taille en pixels (largeur = hauteur). Défaut : 128. */
  size?: number;
  background?: Background;
  /** Teinte 0-360. Par défaut, tirée du nom. */
  hue?: number;
  /** Luminosité 0 (sombre) - 1 (clair). Défaut : 0.5, ou celle du préréglage `color`. */
  tone?: number;
  /** Saturation 0 - 1. Défaut : 0.74, ou celle du préréglage `color`. */
  saturation?: number;
  /** Préréglage ton + saturation : pastel, pale, mid, deep, bright, ink. */
  color?: ColorPreset;
  expression?: Expression;
  animate?: Animation;
  /**
   * Famille de formes, importée à part : `animals` (mochikao/animals), `produce`
   * (mochikao/produce)... Par défaut, les blobs.
   */
  family?: ShapeFamily;
  /** Forme épinglée, parmi celles de la famille. */
  shape?: string;
  eyes?: EyesName;
  mouth?: MouthName;
  extra?: ExtraName;
  /** Épingle des axes bruts (0-1) ; le reste reste tiré du nom. */
  traits?: Partial<Traits>;
  /** Ajoute le CSS qui fait suivre le regard via --gx / --gy. */
  gaze?: boolean;
  /** Texte alternatif. Défaut : le nom. */
  title?: string;
}

export interface Resolved {
  traits: Traits;
  family: ShapeFamily;
  shape: string;
  eyes: EyesName;
  mouth: MouthName;
  extra: ExtraName;
  hue: number;
  colors: Palette;
}

/** Ce que le nom donne, sans dessiner. */
export function resolve(options: MochikaoOptions | string): Resolved {
  const o = typeof options === 'string' ? { name: options } : options;
  const family = isFamily(o.family) ? o.family : blobs;
  const shapes = family.shapes;
  const traits = deriveTraits(o.name, {
    ...o.traits,
    ...pin('shape', o.shape && positionOf(shapes, o.shape)),
    ...pin('eyes', o.eyes && positionOf(EYES, o.eyes)),
    ...pin('mouth', o.mouth && positionOf(MOUTHS, o.mouth)),
    ...pin('extra', o.extra && positionOf(EXTRAS, o.extra)),
  });
  const shape = pick(shapes, traits.shape);
  const natural = family.hue?.(shape);
  const hue = finite(o.hue) ?? (natural === undefined
    ? Math.round(traits.hue * 360)
    : Math.round((natural + (traits.hue - 0.5) * 24 + 360) % 360));
  const preset = typeof o.color === 'string' && Object.hasOwn(COLORS, o.color) ? COLORS[o.color] : undefined;
  return {
    traits,
    family,
    shape,
    eyes: pick(EYES, traits.eyes),
    mouth: pick(MOUTHS, traits.mouth),
    extra: pick(EXTRAS, traits.extra),
    hue,
    colors: palette(
      hue,
      finite(o.tone) ?? preset?.tone ?? 0.5,
      finite(o.saturation) ?? preset?.saturation ?? 0.74,
    ),
  };
}

function pin(axis: keyof Traits, value: number | undefined | '') {
  return typeof value === 'number' ? { [axis]: value } : {};
}

// Les options peuvent venir de JS non typé (props de composants) : on valide à l'exécution.
const finite = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : undefined);
const oneOf = <T>(list: readonly T[], v: unknown, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Rend l'avatar en chaîne SVG autonome. */
export function mochikao(options: MochikaoOptions | string): string {
  const o = typeof options === 'string' ? { name: options } : options;
  const r = resolve(o);
  const { traits, colors } = r;
  const size = Math.round(finite(o.size) ?? 128);
  const expression = oneOf(EXPRESSIONS, o.expression, 'idle');
  const background = oneOf(BACKGROUNDS, o.background, 'none');
  const animate = oneOf(ANIMATIONS, o.animate, 'none');

  const body = buildBody(r.family.silhouette(r.shape, traits), traits);
  const uid = `b${cyrb53(`${r.family.name}:${r.shape}|${body.d}|${expression}|${colors.body}|${r.eyes}${r.mouth}${r.extra}`).toString(36)}`;
  const parts = face({
    family: r.family,
    shape: r.shape,
    uid,
    body,
    colors,
    eyes: r.eyes,
    mouth: r.mouth,
    extra: r.extra,
    expression,
    spread: 9 + traits.spacing * 4.5,
    eyeScale: 0.8 + traits.eyeSize * 0.45,
    mouthScale: 0.8 + traits.mouthSize * 0.45,
    lean: (traits.lean - 0.5) * 30,
    gaze: { x: (traits.gazeX - 0.5) * 2.8, y: (traits.gazeY - 0.5) * 2 },
  });

  const clip = `${uid}c`;
  // Identité du personnage hors expression : morphTo() ne fait la transition
  // animée qu'entre deux SVG qui partagent cette valeur.
  const character = cyrb53(`${r.family.name}:${r.shape}|${JSON.stringify(traits)}|${colors.body}|${background}|${size}`).toString(36);

  let bg = '';
  if (background === 'circle') bg = `<circle cx="50" cy="50" r="50" fill="${colors.bg}"/>`;
  else if (background === 'square') bg = `<rect width="100" height="100" fill="${colors.bg}"/>`;
  else if (background === 'squircle') bg = `<path d="${superellipsePath(50, 50, 50, 5)}" fill="${colors.bg}"/>`;
  const inner = background === 'none' ? '' : ' transform="translate(50 52) scale(.82) translate(-50 -52)"';

  const label = esc(String(o.title ?? o.name ?? ''));
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${label}" class="${uid}" data-mochikao="${character}" data-expression="${expression}">` +
    `<title>${label}</title>` +
    style(uid, animate, o.gaze ?? false, traits.phase) +
    `<defs><clipPath id="${clip}"><path d="${body.d}"/></clipPath></defs>` +
    bg +
    `<g class="bd"><g class="sq"><g${inner}>` +
    parts.behind +
    `<path d="${body.d}" fill="${colors.body}"/>` +
    `<g clip-path="url(#${clip})">` +
    `<ellipse cx="${body.centroid.x.toFixed(2)}" cy="${(body.box.y + body.box.h * 1.02).toFixed(2)}" rx="${(body.box.w * 0.62).toFixed(2)}" ry="${(body.box.h * 0.3).toFixed(2)}" fill="${colors.shade}" opacity=".35"/>` +
    parts.skin +
    `</g>` +
    parts.top +
    `<g class="fc">` +
    `<g class="lk"><g class="gl"><g class="bl">${parts.eyes}</g></g><g class="br">${parts.brows}</g></g>` +
    `<g class="mo">${parts.mouth}</g>` +
    parts.wear +
    `<g class="fr">${parts.front}</g>` +
    `</g></g></g></g></svg>`
  );
}

function style(uid: string, animate: Animation, gaze: boolean, phase: number): string {
  if (animate === 'none' && !gaze) return '';
  const u = `.${uid}`;
  let css = '';
  if (gaze) {
    css +=
      `${u} .lk{transform:translate(calc(var(--gx,0)*1px),calc(var(--gy,0)*1px));transition:transform .18s ease-out}` +
      `${u} .fc{transform:translate(calc(var(--gx,0)*.4px),calc(var(--gy,0)*.4px));transition:transform .18s ease-out}`;
  }
  if (animate !== 'none') {
    // Décalage tiré du nom : une grille d'avatars ne cligne pas à l'unisson.
    const d = (k: number) => `-${((phase * k) % k).toFixed(2)}s`;
    css +=
      `${u} .bd{transform-origin:50px 92px;animation:${uid}b 3.6s ease-in-out ${d(3.6)} infinite}` +
      `${u} .bl{transform-box:fill-box;transform-origin:center;animation:${uid}k 5.2s ${d(5.2)} infinite}` +
      `${u} .gl{animation:${uid}g 9s ease-in-out ${d(9)} infinite}` +
      `@keyframes ${uid}b{0%,100%{transform:scale(1,1)}50%{transform:scale(1.03,.97)}}` +
      `@keyframes ${uid}k{0%,90%,96%,100%{transform:scaleY(1)}93%{transform:scaleY(.1)}}` +
      `@keyframes ${uid}g{0%,40%,100%{transform:translate(0,0)}46%,62%{transform:translate(1.6px,-.6px)}68%,82%{transform:translate(-1.4px,.4px)}}`;
    if (animate === 'hover') {
      css += `${u} .bd,${u} .bl,${u} .gl{animation-play-state:paused}${u}:hover .bd,${u}:hover .bl,${u}:hover .gl{animation-play-state:running}`;
    }
    css += `@media (prefers-reduced-motion:reduce){${u} .bd,${u} .bl,${u} .gl{animation:none}}`;
  }
  return `<style>${css}</style>`;
}

/**
 * Data URI prête pour un <img src>. Encodage minimal plutôt qu'encodeURIComponent :
 * seuls les caractères qui gênent une URL ou un attribut HTML sont encodés.
 * Les guillemets passent en %22 : React, Vue, Svelte et Solid n'ont alors plus rien
 * à échapper en rendu serveur (~20 % plus court qu'encodeURIComponent dans le HTML).
 */
export function mochikaoDataUri(options: MochikaoOptions | string): string {
  const svg = mochikao(options)
    .replace(/[%#&<>{}"']/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/[^\x20-\x7E]+/g, encodeURIComponent);
  return `data:image/svg+xml,${svg}`;
}

/**
 * Un <img> suffit quand rien ne bouge : un seul nœud DOM au lieu de quelques
 * dizaines, ce qui compte dans les longues listes. Les composants s'en servent
 * sauf si l'avatar est animé, suit le regard, ou si `inline` est demandé.
 */
export function rendersAsImage(options: MochikaoOptions & { inline?: boolean }): boolean {
  return !options.inline && !options.gaze && oneOf(ANIMATIONS, options.animate, 'none') === 'none';
}

/** Attributs d'un <img> équivalent à mochikao(options). */
export function mochikaoImage(options: MochikaoOptions): { src: string; width: number; height: number; alt: string } {
  const size = Math.round(finite(options.size) ?? 128);
  return { src: mochikaoDataUri(options), width: size, height: size, alt: String(options.title ?? options.name ?? '') };
}
