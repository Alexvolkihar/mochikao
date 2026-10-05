/** Outils de géométrie et de dessin partagés par les familles de formes. */
import type { Radius } from '../family.ts';
import { angleDiff, type Body, type Point } from '../shape.ts';

export { UP, polygon, superellipse } from '../shape.ts';

/** Bosse douce centrée sur l'angle `at`. */
export const bump = (t: number, at: number, width: number, height: number) =>
  height * Math.exp(-(angleDiff(t, at) ** 2) / width);

/** Pointe triangulaire centrée sur l'angle `at`. */
export const spike = (t: number, at: number, width: number, height: number) =>
  height * Math.max(0, 1 - Math.abs(angleDiff(t, at)) / width);

/**
 * Union de cercles vue depuis l'origine (qui doit être dans chacun d'eux) :
 * pour chaque direction, la sortie la plus lointaine. Donne poires, avocats...
 */
export const circles = (list: [cx: number, cy: number, r: number][]): Radius => (t) => {
  const dx = Math.cos(t);
  const dy = Math.sin(t);
  let best = 0;
  for (const [cx, cy, r] of list) {
    const b = dx * cx + dy * cy;
    const disc = b * b - (cx * cx + cy * cy) + r * r;
    if (disc >= 0) best = Math.max(best, b + Math.sqrt(disc));
  }
  return best;
};

export const f = (n: number) => +n.toFixed(2);

export const circle = (p: Point, r: number, fill: string, extra = '') =>
  `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(r)}" fill="${fill}"${extra}/>`;

export const ellipse = (p: Point, rx: number, ry: number, angle: number, fill: string, extra = '') =>
  `<ellipse cx="${f(p.x)}" cy="${f(p.y)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${f(angle)} ${f(p.x)} ${f(p.y)})" fill="${fill}"${extra}/>`;

/** Feuille en amande, de `from` vers l'angle `deg` (0 = droite), longueur `len`. */
export function leaf(from: Point, deg: number, len: number, fill: string): string {
  const w = len * 0.42;
  return `<path d="M0 0C${f(len * 0.3)} ${f(-w)} ${f(len * 0.75)} ${f(-w)} ${f(len)} 0C${f(len * 0.75)} ${f(w)} ${f(len * 0.3)} ${f(w)} 0 0Z" transform="translate(${f(from.x)} ${f(from.y)}) rotate(${f(deg)})" fill="${fill}"/>`;
}

export const STEM = '#6b4a2b';
export const LEAF = '#4caf50';
export const LEAF_LIGHT = '#7bd389';

export const stem = (from: Point, dx: number, dy: number, width: number) =>
  `<path d="M${f(from.x)} ${f(from.y)}q${f(dx * 0.2)} ${f(dy * 0.6)} ${f(dx)} ${f(dy)}" fill="none" stroke="${STEM}" stroke-width="${f(width)}" stroke-linecap="round"/>`;

/** Triangle d'oreille posé sur la silhouette, à l'angle `at`. */
export function innerEar(body: Body, at: number, fill: string): string {
  const inset = (p: Point, k: number) => ({ x: p.x + (body.centroid.x - p.x) * k, y: p.y + (body.centroid.y - p.y) * k });
  const t = inset(body.project(at), 0.12);
  const l = inset(body.project(at - 0.17, 0.98), 0.02);
  const r = inset(body.project(at + 0.17, 0.98), 0.02);
  return `<path d="M${f(l.x)} ${f(l.y)}L${f(t.x)} ${f(t.y)}L${f(r.x)} ${f(r.y)}Z" fill="${fill}" stroke="${fill}" stroke-width="1.5" stroke-linejoin="round" opacity=".75"/>`;
}
