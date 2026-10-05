import { cyrb53, mulberry32 } from './random.ts';

/**
 * Génération de l'algorithme. Elle entre dans la graine : la changer change
 * tous les avatars, donc on ne l'incrémente que pour une rupture volontaire.
 */
export const GENERATION = 1;

/** Formes de la famille par défaut. Ne pas réordonner : le nom y choisit par index. */
export const SHAPES = [
  'round', 'organic', 'boxy', 'nub', 'cloud',
  'sun', 'capsule', 'triangle', 'hexagon', 'droplet',
] as const;
export const EYES = ['dot', 'oval', 'sparkle', 'sleepy', 'wide'] as const;
export const MOUTHS = ['smile', 'grin', 'o', 'cat', 'flat', 'tongue'] as const;
export const EXTRAS = [
  'none', 'blush', 'freckles', 'antenna', 'sprout', 'shine',
  'glasses', 'sunglasses', 'bow', 'crown', 'hat',
] as const;
export const EXPRESSIONS = ['idle', 'happy', 'sad', 'mad', 'love', 'shy', 'sick', 'thinking'] as const;
export const BACKGROUNDS = ['none', 'circle', 'squircle', 'square'] as const;
export const ANIMATIONS = ['none', 'hover', 'always'] as const;

/** Préréglages de couleur : un couple ton / saturation. */
export const COLORS = {
  pastel: { tone: 0.78, saturation: 0.6 },
  pale: { tone: 0.9, saturation: 0.42 },
  mid: { tone: 0.5, saturation: 0.74 },
  deep: { tone: 0.24, saturation: 0.7 },
  bright: { tone: 0.55, saturation: 1 },
  ink: { tone: 0.06, saturation: 0.3 },
} as const;

/** Formes de la famille par défaut (blobs). Les autres familles ont leurs propres noms. */
export type ShapeName = (typeof SHAPES)[number];
export type ColorPreset = keyof typeof COLORS;
export type EyesName = (typeof EYES)[number];
export type MouthName = (typeof MOUTHS)[number];
export type ExtraName = (typeof EXTRAS)[number];
export type Expression = (typeof EXPRESSIONS)[number];
export type Background = (typeof BACKGROUNDS)[number];
export type Animation = (typeof ANIMATIONS)[number];

/** Chaque axe est une position dans [0, 1) tirée du nom, ou épinglée à la main. */
export interface Traits {
  shape: number;
  hue: number;
  eyes: number;
  mouth: number;
  extra: number;
  wobble: number;
  spacing: number;
  phase: number;
  /** Taille du corps dans le cadre. */
  bodySize: number;
  /** Rapport largeur / hauteur du corps. */
  proportion: number;
  /** 0 arrondit la forme, 0.5 la laisse telle quelle, 1 la rend carrée. */
  squareness: number;
  eyeSize: number;
  /** Inclinaison des yeux, en miroir. 0.5 = droits. */
  lean: number;
  /** Direction du regard au repos. 0.5 = droit devant. */
  gazeX: number;
  gazeY: number;
  mouthSize: number;
}

/** Axes réglables en continu (les autres choisissent dans une liste ou désynchronisent les animations). */
export const CONTINUOUS_AXES = [
  'bodySize', 'proportion', 'squareness', 'wobble',
  'eyeSize', 'spacing', 'lean', 'gazeX', 'gazeY', 'mouthSize',
] as const satisfies readonly (keyof Traits)[];

// L'ordre des tirages fait partie du contrat de stabilité : ne pas le réordonner,
// et n'ajouter de nouveaux axes qu'à la fin.
const AXES = [
  'shape', 'hue', 'eyes', 'mouth', 'extra', 'wobble', 'spacing', 'phase',
  'bodySize', 'proportion', 'squareness', 'eyeSize', 'lean', 'gazeX', 'gazeY', 'mouthSize',
] as const satisfies readonly (keyof Traits)[];

export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function seedOf(name: string): number {
  // « bulle » est l'ancien nom du projet. Le préfixe entre dans la graine :
  // le changer changerait tous les avatars, donc il reste tel quel.
  return cyrb53(`bulle:g${GENERATION}:${normalizeName(String(name ?? ''))}`);
}

export function deriveTraits(name: string, pinned: Partial<Traits> = {}): Traits {
  const rand = mulberry32(seedOf(name) % 4294967296);
  const traits = {} as Traits;
  for (const axis of AXES) {
    const drawn = rand();
    const pin = pinned[axis];
    traits[axis] = typeof pin === 'number' && Number.isFinite(pin) ? clamp01(pin) : drawn;
  }
  return traits;
}

export function pick<T>(list: readonly T[], t: number): T {
  return list[Math.min(list.length - 1, Math.floor(clamp01(t) * list.length))]!;
}

/** Position au centre de la case `value` dans `list`, pour épingler un axe par son nom. */
export function positionOf<T>(list: readonly T[], value: T): number | undefined {
  const i = list.indexOf(value);
  return i < 0 ? undefined : (i + 0.5) / list.length;
}

function clamp01(n: number): number {
  return Math.min(0.999999, Math.max(0, n));
}
