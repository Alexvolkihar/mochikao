import type { Decoration, ShapeDef, ShapeFamily } from '../family.ts';
import { LEAF, LEAF_LIGHT, UP, bump, circle, circles, ellipse, f, leaf, polygon, stem, superellipse } from './kit.ts';

/** Ne pas réordonner : le nom choisit une forme par son index. */
export const PRODUCE = ['apple', 'pear', 'strawberry', 'lemon', 'carrot', 'avocado'] as const;
export type Produce = (typeof PRODUCE)[number];

const HUES: Record<Produce, number> = { apple: 356, pear: 72, strawberry: 350, lemon: 50, carrot: 24, avocado: 92 };

function silhouette(shape: Produce): ShapeDef {
  switch (shape) {
    case 'apple': {
      const base = superellipse(1.04, 0.95, 2.1);
      return { r: (t) => base(t) - bump(t, UP, 0.035, 0.12) - bump(t, -UP, 0.05, 0.04), smooth: 0, fit: 0.88, dy: 4 };
    }
    case 'pear':
      return { r: circles([[0, 0.3, 0.72], [0, -0.42, 0.42]]), smooth: 3, fit: 0.9, dy: 4 };
    case 'strawberry': {
      const tri = polygon(3, Math.PI / 2);
      return { r: (t) => tri(t) * 0.62 + 0.38, smooth: 3, fit: 0.86, dy: 5 };
    }
    case 'lemon': {
      const base = superellipse(1.15, 0.86, 2.2);
      return { r: (t) => base(t) + bump(t, 0, 0.02, 0.15) + bump(t, Math.PI, 0.02, 0.15), smooth: 0, fit: 0.92, dy: 3 };
    }
    case 'carrot': {
      const tri = polygon(3, Math.PI / 2);
      return { r: (t) => tri(t) * 0.75 + 0.25, smooth: 2, fit: 0.8, dy: 8, aspect: 0.74 };
    }
    case 'avocado':
      return { r: circles([[0, 0.24, 0.74], [0, -0.36, 0.52]]), smooth: 3, fit: 0.94, dy: 2 };
  }
}

/**
 * Fruits & légumes : pomme, poire, fraise, citron, carotte, avocat,
 * chacun avec sa teinte naturelle.
 *
 *   import { produce } from 'mochikao/produce';
 *   mochikao({ name: 'alex', family: produce });
 */
export const produce: ShapeFamily<Produce> = {
  name: 'produce',
  shapes: PRODUCE,
  silhouette,
  hue: (shape) => HUES[shape],
  decorate(shape, body, colors, eyeY): Decoration {
    const R = body.scale;
    const { project, crown, centroid: c, box } = body;
    switch (shape) {
      case 'apple':
      case 'pear': {
        const top = shape === 'apple' ? project(UP) : crown;
        return { behind: stem({ x: top.x, y: top.y + 3 }, 1.5, -10, 2.4), over: leaf({ x: top.x + 1.2, y: top.y - 4.5 }, -28, 11, LEAF) };
      }
      case 'lemon':
        return { over: leaf({ x: crown.x - 1, y: crown.y + 0.5 }, -150, 10, LEAF) + leaf({ x: crown.x + 1, y: crown.y + 0.5 }, -35, 8, LEAF_LIGHT) };
      case 'strawberry': {
        // Collerette de cinq sépales, et des pépins hors de la zone du visage.
        const top = { x: crown.x, y: crown.y + 2 };
        let over = '';
        for (const deg of [-170, -125, -90, -55, -10]) over += leaf(top, deg + 180, 10, deg === -90 ? LEAF_LIGHT : LEAF);
        let skin = '';
        for (let row = 0; row < 7; row++) {
          for (let col = -4; col <= 4; col++) {
            const p = { x: c.x + col * 7 + (row % 2) * 3.5, y: box.y + 12 + row * 8 };
            const inFace = Math.abs(p.x - c.x) < 18 && p.y > eyeY - 8 && p.y < eyeY + 18;
            if (!inFace) skin += ellipse(p, 0.9, 1.4, 0, '#fff4c2', ' opacity=".75"');
          }
        }
        return { behind: stem(top, 0.5, -8, 2.2), over, skin };
      }
      case 'carrot': {
        const top = { x: crown.x, y: crown.y + 2 };
        let skin = '';
        for (const k of [0.62, 0.74, 0.86]) {
          const y = box.y + box.h * k;
          const half = (1 - k) * box.w * 0.55;
          skin += `<path d="M${f(c.x - half)} ${f(y)}q${f(half * 0.5)} 1 ${f(half * 0.8)} 0" stroke="${colors.shade}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;
        }
        return { behind: [-20, 0, 20].map((d) => leaf(top, -90 + d, 15, d === 0 ? LEAF_LIGHT : LEAF)).join(''), skin };
      }
      case 'avocado': {
        const pit = { x: c.x, y: box.y + box.h * 0.83 };
        return {
          faceDy: -12,
          skin:
            circle(pit, 0.23 * R, '#f3f0b0', ' opacity=".55"') +
            circle(pit, 0.16 * R, '#8a5a2b') +
            circle({ x: pit.x - 0.06 * R, y: pit.y - 0.06 * R }, 0.05 * R, '#fff', ' opacity=".35"'),
        };
      }
    }
  },
};
