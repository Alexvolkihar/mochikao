import type { Decoration, ShapeDef, ShapeFamily } from '../family.ts';
import { UP, circle, ellipse, innerEar, bump, spike, superellipse } from './kit.ts';

/** Ne pas réordonner : le nom choisit une forme par son index. */
export const ANIMALS = ['cat', 'bear', 'bunny', 'frog', 'pig', 'mouse'] as const;
export type Animal = (typeof ANIMALS)[number];

function silhouette(shape: Animal): ShapeDef {
  switch (shape) {
    case 'cat': {
      const base = superellipse(1, 0.92, 2.3);
      return { r: (t) => base(t) + spike(t, UP - 0.62, 0.3, 0.42) + spike(t, UP + 0.62, 0.3, 0.42), smooth: 0 };
    }
    case 'bear':
      return { r: superellipse(1, 0.95, 2.2), smooth: 0, fit: 0.9, dy: 4 };
    case 'mouse':
      return { r: superellipse(1, 0.93, 2.2), smooth: 0, fit: 0.86, dy: 5 };
    case 'bunny':
      return { r: superellipse(1, 0.96, 2.3), smooth: 0, fit: 0.72, dy: 12 };
    case 'frog': {
      const base = superellipse(1.18, 0.86, 2.4);
      return { r: (t) => base(t) + bump(t, UP - 0.72, 0.045, 0.3) + bump(t, UP + 0.72, 0.045, 0.3), smooth: 0 };
    }
    case 'pig': {
      const base = superellipse(1.05, 0.95, 2.3);
      return { r: (t) => base(t) + spike(t, UP - 0.9, 0.28, 0.26) + spike(t, UP + 0.9, 0.28, 0.26), smooth: 0 };
    }
  }
}

/**
 * Animaux : chat, ours, lapin, grenouille, cochon, souris.
 *
 *   import { animals } from 'mochikao/animals';
 *   mochikao({ name: 'alex', family: animals });
 */
export const animals: ShapeFamily<Animal> = {
  name: 'animals',
  shapes: ANIMALS,
  silhouette,
  decorate(shape, body, colors, eyeY): Decoration {
    const R = body.scale;
    const { project, centroid: c } = body;
    switch (shape) {
      case 'cat':
        return { over: innerEar(body, UP - 0.62, colors.cheek) + innerEar(body, UP + 0.62, colors.cheek) };
      case 'pig':
        return {
          over:
            innerEar(body, UP - 0.9, colors.cheek) + innerEar(body, UP + 0.9, colors.cheek) +
            ellipse({ x: c.x, y: eyeY + 7.5 }, 6.2, 4.4, 0, colors.shade) +
            ellipse({ x: c.x - 2.1, y: eyeY + 7.5 }, 1.1, 1.6, 0, colors.ink, ' opacity=".7"') +
            ellipse({ x: c.x + 2.1, y: eyeY + 7.5 }, 1.1, 1.6, 0, colors.ink, ' opacity=".7"'),
          mouthDy: 6,
        };
      case 'bear':
      case 'mouse': {
        const [angle, dist, size, inner] = shape === 'bear' ? [0.8, 0.98, 0.3, 0.16] : [0.88, 0.94, 0.42, 0.27];
        let behind = '';
        for (const side of [-1, 1]) {
          const p = project(UP + side * angle, dist);
          behind += circle(p, size * R, colors.body) + circle(p, inner * R, colors.cheek, ' opacity=".7"');
        }
        return { behind, over: shape === 'mouse' ? ellipse({ x: c.x, y: eyeY + 5 }, 1.8, 1.4, 0, colors.ink) : '' };
      }
      case 'bunny': {
        let behind = '';
        for (const side of [-1, 1]) {
          const p = project(UP + side * 0.3, 1.5);
          const tilt = side * 10;
          behind += ellipse(p, 0.21 * R, 0.62 * R, tilt, colors.body) + ellipse(p, 0.1 * R, 0.46 * R, tilt, colors.cheek, ' opacity=".7"');
        }
        return { behind };
      }
      case 'frog': {
        const eyes = [project(UP - 0.72, 0.97), project(UP + 0.72, 0.97)] as [typeof c, typeof c];
        return { eyes, over: eyes.map((p) => circle(p, 0.16 * R, '#fff', ' opacity=".55"')).join('') };
      }
    }
  },
};
