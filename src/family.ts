import type { Palette } from './color.ts';
import type { Body, Point } from './shape.ts';

export type Radius = (t: number) => number;

/** Silhouette d'une forme, en coordonnées polaires (rayon 1 ≈ cercle). */
export interface ShapeDef {
  r: Radius;
  /** Passes de lissage du rayon, pour arrondir les coins. */
  smooth: number;
  /** Réduit le corps pour laisser la place à ce qui dépasse (oreilles, tiges). */
  fit?: number;
  /** Décale le corps vers le bas, même raison. */
  dy?: number;
  /** Étire en largeur (< 1 : plus étroit). */
  aspect?: number;
}

/** Ce qu'une forme ajoute autour du visage : oreilles, tige, pépins... */
export interface Decoration {
  /** Derrière le corps (oreilles détachées, tiges, fanes). */
  behind?: string;
  /** Sur le corps, découpé par sa silhouette (pépins, noyau, stries). */
  skin?: string;
  /** Sur le corps, non découpé, sous le visage (intérieur des oreilles, feuilles, groin). */
  over?: string;
  /** Position imposée des yeux (grenouille). */
  eyes?: [Point, Point];
  /** Décalage vertical de la bouche (sous le groin). */
  mouthDy?: number;
  /** Décalage vertical de tout le visage. */
  faceDy?: number;
}

/**
 * Une famille de formes. mochikao n'embarque que les blobs ; les autres familles
 * s'importent à part (`mochikao/animals`, `mochikao/produce`) et se passent en option,
 * pour que seuls ceux qui s'en servent en paient le poids.
 *
 * Contrat de stabilité : le nom choisit une forme par son index dans `shapes`.
 * Ne pas réordonner la liste d'une famille publiée ; n'ajouter qu'à la fin
 * change déjà certains avatars.
 */
export interface ShapeFamily<S extends string = string> {
  readonly name: string;
  readonly shapes: readonly S[];
  silhouette(shape: S, traits: { wobble: number; phase: number }): ShapeDef;
  decorate?(shape: S, body: Body, colors: Palette, eyeY: number): Decoration;
  /** Teinte naturelle (le nom la fait varier de ±12°), ou undefined pour une teinte libre. */
  hue?(shape: S): number | undefined;
}

export function isFamily(value: unknown): value is ShapeFamily {
  const f = value as ShapeFamily | null;
  return typeof f === 'object' && f !== null && typeof f.name === 'string' &&
    Array.isArray(f.shapes) && f.shapes.length > 0 && typeof f.silhouette === 'function';
}
