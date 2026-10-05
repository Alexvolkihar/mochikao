import type { MochikaoOptions } from './index.ts';
import type { ShapeFamily } from './family.ts';
import { blobs } from './shape.ts';
import { ANIMATIONS, BACKGROUNDS, COLORS, CONTINUOUS_AXES, EXPRESSIONS, EXTRAS, EYES, MOUTHS, type Traits } from './traits.ts';

type Source = { get(key: string): string | null | undefined };

const oneOf = <T extends string>(list: readonly T[], v: string | null | undefined): T | undefined =>
  v != null && (list as readonly string[]).includes(v) ? (v as T) : undefined;

const num = (v: string | null | undefined, min: number, max: number): number | undefined => {
  if (v == null || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : undefined;
};

/**
 * Options depuis des paramètres texte (query string, attributs HTML, flags CLI).
 * Les valeurs invalides sont ignorées plutôt que de faire échouer le rendu.
 * `families` liste les familles qu'on accepte de désigner par leur nom
 * (`?family=animals`) ; sans elles, seuls les blobs sont disponibles.
 */
export function parseParams(name: string, src: Source, families: readonly ShapeFamily[] = []): MochikaoOptions {
  const options: MochikaoOptions = { name };
  const set = <K extends keyof MochikaoOptions>(key: K, value: MochikaoOptions[K] | undefined) => {
    if (value !== undefined) options[key] = value;
  };
  set('size', num(src.get('size'), 16, 1024));
  set('background', oneOf(BACKGROUNDS, src.get('background') ?? src.get('bg')));
  set('hue', num(src.get('hue'), 0, 360));
  set('tone', num(src.get('tone'), 0, 1));
  set('expression', oneOf(EXPRESSIONS, src.get('expression')));
  set('animate', oneOf(ANIMATIONS, src.get('animate')));
  // `family` désigne une famille par son nom, parmi celles qu'on nous a confiées.
  const family = families.find((fam) => fam.name === src.get('family'));
  set('family', family);
  set('shape', oneOf((family ?? blobs).shapes, src.get('shape')));
  set('eyes', oneOf(EYES, src.get('eyes')));
  set('mouth', oneOf(MOUTHS, src.get('mouth')));
  set('extra', oneOf(EXTRAS, src.get('extra')));
  set('saturation', num(src.get('saturation'), 0, 1));
  set('color', oneOf(Object.keys(COLORS) as (keyof typeof COLORS)[], src.get('color')));
  // Axes continus épinglés : ?bodySize=0.3&lean=0.8...
  const traits: Partial<Traits> = {};
  for (const axis of CONTINUOUS_AXES) {
    const v = num(src.get(axis), 0, 1);
    if (v !== undefined) traits[axis] = v;
  }
  if (Object.keys(traits).length) options.traits = traits;
  return options;
}

const KEYS = [
  'size', 'background', 'hue', 'tone', 'saturation', 'color', 'expression', 'animate',
  'shape', 'eyes', 'mouth', 'extra',
] as const;

/**
 * Inverse de parseParams : les options (hors nom) en paramètres texte, pour une
 * URL d'API, des attributs HTML ou un lien partageable. Les valeurs par défaut
 * sont omises pour garder l'URL courte.
 */
export function toParams(options: MochikaoOptions): URLSearchParams {
  const out = new URLSearchParams();
  const defaults: Partial<Record<(typeof KEYS)[number], unknown>> = { expression: 'idle', background: 'none', animate: 'none' };
  if (options.family && options.family.name !== blobs.name) out.set('family', options.family.name);
  for (const key of KEYS) {
    const v = options[key];
    if (v === undefined || v === defaults[key]) continue;
    out.set(key, typeof v === 'number' ? String(+v.toFixed(3)) : String(v));
  }
  for (const axis of CONTINUOUS_AXES) {
    const v = options.traits?.[axis];
    if (typeof v === 'number') out.set(axis, String(+v.toFixed(3)));
  }
  return out;
}
