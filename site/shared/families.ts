import { animals } from '../../src/families/animals.ts';
import { produce } from '../../src/families/produce.ts';
import { blobs, type ShapeFamily } from '../../src/index.ts';

/** Le site montre toutes les familles ; une appli n'importerait que celles qu'elle utilise. */
export const FAMILIES = { blob: blobs, animals, produce } as const satisfies Record<string, ShapeFamily>;
export type FamilyName = keyof typeof FAMILIES;
export const EXTRA_FAMILIES: readonly ShapeFamily[] = [animals, produce];
