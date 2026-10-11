import { animals } from '../../src/families/animals.ts';
import { produce } from '../../src/families/produce.ts';
import { blobs, mix, type ShapeFamily } from '../../src/index.ts';

/** Le site montre toutes les familles ; une appli n'importerait que celles qu'elle utilise. */
export const FAMILIES = { blob: blobs, animals, produce } as const satisfies Record<string, ShapeFamily>;
export type FamilyName = keyof typeof FAMILIES;
export const EXTRA_FAMILIES: readonly ShapeFamily[] = [animals, produce];

/** Les modes de l'éditeur : une famille seule, ou chaque combinaison. Clé = nom canonique (= `?family=`). */
export const MODES: Record<string, ShapeFamily> = Object.fromEntries(
  [blobs, animals, produce, mix(blobs, animals), mix(blobs, produce), mix(animals, produce), mix(blobs, animals, produce)]
    .map((f) => [f.name, f]),
);

/** Libellé d'un mode : « blobs + animaux », ou « tout » pour les trois. */
export function modeLabel(key: string, label: (group: string, value: string) => string): string {
  const parts = key.split('+');
  return parts.length === 3 ? label('family', 'all') : parts.map((p) => label('family', p)).join(' + ');
}
