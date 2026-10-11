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

/**
 * Combine plusieurs familles en une : le nom choisit parmi toutes leurs formes.
 *
 *   mix(blobs, animals)            // blobs et animaux
 *   mix(blobs, animals, produce)   // tout
 *
 * Chaque forme a la même chance d'être tirée, donc une famille pèse selon son
 * nombre de formes. L'ordre des arguments ne compte pas : les familles sont
 * triées par nom (le résultat s'appelle `animals+blob`), ce qui fixe la liste
 * des formes et donc quel avatar sort pour quel nom. Si deux familles ont une
 * forme du même nom, la première (dans l'ordre trié) l'emporte.
 */
export function mix(...families: ShapeFamily[]): ShapeFamily {
  const unique = [...new Map(families.filter(isFamily).map((f) => [f.name, f])).values()]
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  if (unique.length === 0) throw new TypeError('mix() attend au moins une famille');
  if (unique.length === 1) return unique[0]!;

  const owner = new Map<string, ShapeFamily>();
  for (const f of unique) for (const s of f.shapes) if (!owner.has(s)) owner.set(s, f);
  const of = (shape: string) => owner.get(shape) ?? unique[0]!;

  return {
    name: unique.map((f) => f.name).join('+'),
    shapes: [...owner.keys()],
    silhouette: (shape, traits) => of(shape).silhouette(shape, traits),
    decorate: (shape, body, colors, eyeY) => of(shape).decorate?.(shape, body, colors, eyeY) ?? {},
    hue: (shape) => of(shape).hue?.(shape),
  };
}
