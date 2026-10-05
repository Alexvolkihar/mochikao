import type { Radius, ShapeDef, ShapeFamily } from './family.ts';
import { SHAPES, type ShapeName } from './traits.ts';

const TAU = Math.PI * 2;
const SAMPLES = 48;
const CENTER_Y = 53;

export interface Point {
  x: number;
  y: number;
}

export interface Body {
  d: string;
  points: Point[];
  box: { x: number; y: number; w: number; h: number };
  /** Centre de masse : le visage s'y accroche, même sur une goutte ou un triangle. */
  centroid: Point;
  /** Point le plus haut. */
  top: Point;
  /** Sommet de la tête (dans l'axe), pour poser chapeau, couronne, tige... */
  crown: Point;
  /** Taille d'une unité de rayon dans le viewBox. */
  scale: number;
  /** Point à l'angle `a` (radians, 0 = droite, -π/2 = haut), à `r` fois le rayon de la forme. */
  project(a: number, r?: number): Point;
}

export const superellipse = (a: number, b: number, n: number): Radius => (t) =>
  ((Math.abs(Math.cos(t) / a) ** n) + (Math.abs(Math.sin(t) / b) ** n)) ** (-1 / n);

export const polygon = (k: number, rotation: number): Radius => (t) => {
  const seg = TAU / k;
  const u = (((t - rotation) % seg) + seg) % seg;
  return Math.cos(Math.PI / k) / Math.cos(u - Math.PI / k);
};

export const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const UP = -Math.PI / 2;

function blob(shape: ShapeName, { wobble, phase }: { wobble: number; phase: number }): ShapeDef {
  const p = phase * TAU;
  const w = 0.5 + wobble;
  switch (shape) {
    case 'round':
      return { r: () => 1, smooth: 0 };
    case 'organic':
      return {
        r: (t) => 1 + 0.05 * w * Math.sin(2 * t + p) + 0.045 * w * Math.sin(3 * t + 2 * p) + 0.02 * Math.sin(5 * t + p),
        smooth: 0,
      };
    case 'boxy':
      return { r: superellipse(1, 0.94, 4.2), smooth: 0 };
    case 'nub': {
      const base = superellipse(1, 1.02, 2.3);
      const at = -Math.PI / 2 + (wobble - 0.5) * 0.9;
      return { r: (t) => base(t) + 0.16 * Math.exp(-(angleDiff(t, at) ** 2) / 0.05), smooth: 1 };
    }
    case 'cloud':
      return { r: (t) => 0.9 + 0.11 * Math.abs(Math.sin(3.5 * t + 0.45)), smooth: 1 };
    case 'sun':
      return { r: (t) => 1 + 0.055 * Math.cos(8 * t + p), smooth: 0 };
    case 'capsule':
      return { r: superellipse(0.8, 1.05, 2.8), smooth: 0 };
    case 'triangle':
      return { r: polygon(3, -Math.PI / 2), smooth: 3 };
    case 'hexagon':
      return { r: polygon(6, 0), smooth: 2 };
    case 'droplet':
      return { r: (t) => 1 + 0.38 * Math.max(0, -Math.sin(t)) ** 6, smooth: 1 };

  }
}

function smoothRadii(radii: number[], passes: number): number[] {
  let out = radii;
  for (let pass = 0; pass < passes; pass++) {
    const prev = out;
    out = prev.map((r, i) => (prev.at(i - 1)! + 2 * r + prev[(i + 1) % prev.length]!) / 4);
  }
  return out;
}

const f = (n: number) => +n.toFixed(2);

/** Chemin fermé lissé (Catmull-Rom -> Bézier cubiques). */
export function smoothPath(points: Point[]): string {
  const n = points.length;
  const at = (i: number) => points[((i % n) + n) % n]!;
  let d = `M${f(at(0).x)} ${f(at(0).y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    d += `C${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)} ${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return `${d}Z`;
}

export interface BodyTraits {
  wobble: number;
  phase: number;
  bodySize: number;
  proportion: number;
  squareness: number;
}

/** La famille par défaut, embarquée dans mochikao. */
export const blobs: ShapeFamily<ShapeName> = { name: 'blob', shapes: SHAPES, silhouette: blob };

const square = superellipse(1, 1, 4);

export function buildBody(def: ShapeDef, t: BodyTraits): Body {
  // Carrure : sous 0.5 on tire vers le cercle, au-dessus vers le carré arrondi.
  const toRound = Math.max(0, 0.5 - t.squareness) * 0.9;
  const toSquare = Math.max(0, t.squareness - 0.5) * 0.9;
  const radius = (a: number) => {
    const r = def.r(a);
    return r + (1 - r) * toRound + (square(a) - r) * toSquare;
  };
  const stretch = (1 + (t.proportion - 0.5) * 0.3) * (def.aspect ?? 1);
  const angles = Array.from({ length: SAMPLES }, (_, i) => (i / SAMPLES) * TAU);
  const radii = smoothRadii(angles.map(radius), def.smooth);
  const raw = angles.map((a, i) => ({ x: Math.cos(a) * radii[i]! * stretch, y: Math.sin(a) * radii[i]! }));

  // Mise à l'échelle sur une boîte commune pour que toutes les formes pèsent pareil.
  const xs = raw.map((p) => p.x);
  const ys = raw.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX;
  const h = Math.max(...ys) - minY;
  const fit = (64 + t.bodySize * 14) * (def.fit ?? 1);
  const s = fit / Math.max(w, h);
  const ox = 50 - (w * s) / 2;
  const oy = CENTER_Y + (def.dy ?? 0) - (h * s) / 2;
  const place = (x: number, y: number) => ({ x: ox + (x - minX) * s, y: oy + (y - minY) * s });
  const points = raw.map((p) => place(p.x, p.y));
  const project = (a: number, r = radius(a)) => place(Math.cos(a) * r * stretch, Math.sin(a) * r);

  return {
    d: smoothPath(points),
    points,
    box: { x: ox, y: oy, w: w * s, h: h * s },
    centroid: centroid(points),
    top: points.reduce((a, b) => (b.y < a.y ? b : a)),
    crown: project(UP),
    scale: s,
    project,
  };
}

function centroid(points: Point[]): Point {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const q = points[(i + 1) % points.length]!;
    const cross = p.x * q.y - q.x * p.y;
    a += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  return { x: cx / (3 * a), y: cy / (3 * a) };
}

/** Squircle plein cadre, pour le fond. */
export function superellipsePath(cx: number, cy: number, r: number, n: number): string {
  const radius = superellipse(1, 1, n);
  const points = Array.from({ length: SAMPLES }, (_, i) => {
    const t = (i / SAMPLES) * TAU;
    return { x: cx + Math.cos(t) * radius(t) * r, y: cy + Math.sin(t) * radius(t) * r };
  });
  return smoothPath(points);
}
