import type { Palette } from './color.ts';
import type { Body } from './shape.ts';
import type { Point } from './shape.ts';
import type { ShapeFamily } from './family.ts';
import type { Expression, ExtraName, EyesName, MouthName } from './traits.ts';

export interface FaceInput {
  family: ShapeFamily;
  shape: string;
  body: Body;
  colors: Palette;
  eyes: EyesName;
  mouth: MouthName;
  extra: ExtraName;
  expression: Expression;
  /** Demi-écart entre les yeux, en unités du viewBox. */
  spread: number;
  /** Préfixe unique pour les id SVG. */
  uid: string;
  /** Échelle des yeux et de la bouche. */
  eyeScale: number;
  mouthScale: number;
  /** Inclinaison des yeux en degrés (œil gauche ; le droit en miroir). */
  lean: number;
  /** Décalage du regard au repos, en unités du viewBox. */
  gaze: { x: number; y: number };
}

export interface FaceParts {
  /** Dessiné derrière le corps (antenne, pousse). */
  behind: string;
  /** Dessiné sur le corps, sous le visage (reflet, teint malade). */
  skin: string;
  eyes: string;
  brows: string;
  mouth: string;
  /** Joues, taches de rousseur, goutte de sueur... */
  front: string;
  /** Sur le corps, sous le visage, hors transition : oreilles, groin, chapeau... */
  top: string;
  /** Porté sur le visage, hors transition : lunettes. */
  wear: string;
}

const f = (n: number) => +n.toFixed(2);
const W = 2.6;

const stroke = (d: string, ink: string, width = W) =>
  `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;

function eye(kind: EyesName, x: number, y: number, ink: string): string {
  switch (kind) {
    case 'dot':
      return `<circle cx="${f(x)}" cy="${f(y)}" r="3.4" fill="${ink}"/>`;
    case 'oval':
      return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="2.9" ry="4.6" fill="${ink}"/>`;
    case 'sparkle':
      return `<circle cx="${f(x)}" cy="${f(y)}" r="4.4" fill="${ink}"/><circle cx="${f(x - 1.4)}" cy="${f(y - 1.5)}" r="1.5" fill="#fff"/>`;
    case 'sleepy':
      return stroke(`M${f(x - 4)} ${f(y)}Q${f(x)} ${f(y + 3.6)} ${f(x + 4)} ${f(y)}`, ink);
    case 'wide':
      return `<circle cx="${f(x)}" cy="${f(y)}" r="4.8" fill="#fff" stroke="${ink}" stroke-width="1.3"/><circle cx="${f(x + 0.6)}" cy="${f(y + 0.4)}" r="2.5" fill="${ink}"/>`;
  }
}

function heart(x: number, y: number, s: number, fill: string): string {
  return `<path d="M${f(x)} ${f(y + s * 0.9)}C${f(x - s * 1.6)} ${f(y - s * 0.2)} ${f(x - s * 0.6)} ${f(y - s * 1.3)} ${f(x)} ${f(y - s * 0.35)}C${f(x + s * 0.6)} ${f(y - s * 1.3)} ${f(x + s * 1.6)} ${f(y - s * 0.2)} ${f(x)} ${f(y + s * 0.9)}Z" fill="${fill}"/>`;
}

/** Taille, inclinaison et regard appliqués autour du centre de chaque œil. */
function placeEye(input: FaceInput, x: number, y: number, side: -1 | 1, svg: string): string {
  const { eyeScale, lean, gaze } = input;
  const angle = side === -1 ? lean : -lean;
  return `<g transform="translate(${f(x + gaze.x)} ${f(y + gaze.y)}) rotate(${f(angle)}) scale(${f(eyeScale)}) translate(${f(-x)} ${f(-y)})">${svg}</g>`;
}

function eyesFor(input: FaceInput, at: [Point, Point]): string {
  return at.map((p, i) => placeEye(input, p.x, p.y, i === 0 ? -1 : 1, eyeShape(input, p.x, p.y))).join('');
}

const GOLD = '#f6c445';

function accessory(extra: ExtraName, eyes: [Point, Point], crown: Point, colors: Palette): { top: string; wear: string } {
  const [l, r] = eyes;
  switch (extra) {
    case 'glasses': {
      const ring = (p: Point) => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="6.4" fill="#fff" fill-opacity=".18" stroke="${colors.ink}" stroke-width="1.6"/>`;
      return {
        top: '',
        wear: ring(l) + ring(r) + stroke(`M${f(l.x + 6.4)} ${f(l.y)}Q${f((l.x + r.x) / 2)} ${f(l.y - 2.5)} ${f(r.x - 6.4)} ${f(r.y)}`, colors.ink, 1.6),
      };
    }
    case 'sunglasses': {
      const lens = (p: Point) =>
        `<rect x="${f(p.x - 6.8)}" y="${f(p.y - 4.6)}" width="13.6" height="9.2" rx="3.6" fill="#1b1a1f"/>` +
        `<path d="M${f(p.x - 4)} ${f(p.y - 1.8)}l2.6-1.4" stroke="#fff" stroke-opacity=".55" stroke-width="1.2" stroke-linecap="round"/>`;
      return { top: '', wear: lens(l) + lens(r) + stroke(`M${f(l.x + 6.8)} ${f(l.y - 1.5)}H${f(r.x - 6.8)}`, '#1b1a1f', 1.8) };
    }
    case 'bow': {
      const b = { x: crown.x + 9, y: crown.y + 3 };
      return {
        top: `<g transform="rotate(-18 ${f(b.x)} ${f(b.y)})"><path d="M${f(b.x)} ${f(b.y)}l-8-5.5q-1.5 5.5 0 11zM${f(b.x)} ${f(b.y)}l8-5.5q1.5 5.5 0 11z" fill="#ff6b8b" stroke="#d94a6b" stroke-width="1" stroke-linejoin="round"/><circle cx="${f(b.x)}" cy="${f(b.y)}" r="2.4" fill="#d94a6b"/></g>`,
        wear: '',
      };
    }
    case 'crown': {
      const { x, y } = { x: crown.x, y: crown.y + 2 };
      return {
        top: `<path d="M${f(x - 10)} ${f(y + 2)}V${f(y - 7)}l5 4.5 5-8 5 8 5-4.5V${f(y + 2)}Z" fill="${GOLD}" stroke="#c9952a" stroke-width="1.2" stroke-linejoin="round"/>` +
          `<circle cx="${f(x)}" cy="${f(y - 2)}" r="1.6" fill="#e5384f"/><circle cx="${f(x - 6)}" cy="${f(y - 1)}" r="1.1" fill="#4c8dff"/><circle cx="${f(x + 6)}" cy="${f(y - 1)}" r="1.1" fill="#4c8dff"/>`,
        wear: '',
      };
    }
    case 'hat': {
      const { x, y } = { x: crown.x, y: crown.y + 3 };
      return {
        top: `<path d="M${f(x - 9)} ${f(y)}L${f(x + 2)} ${f(y - 19)}L${f(x + 9)} ${f(y)}Z" fill="#7c5cff" stroke="#5a3fd6" stroke-width="1.2" stroke-linejoin="round"/>` +
          `<path d="M${f(x - 5.5)} ${f(y - 6)}l9.5 1.5M${f(x - 2)} ${f(y - 12)}l5.8 1" stroke="#fff" stroke-opacity=".6" stroke-width="1.6" stroke-linecap="round"/>` +
          `<circle cx="${f(x + 2)}" cy="${f(y - 19.5)}" r="2.8" fill="#ffd166"/>`,
        wear: '',
      };
    }
    default:
      return { top: '', wear: '' };
  }
}

function eyeShape(input: FaceInput, x0: number, y: number): string {
  const { expression, colors } = input;
  const xs = [x0];
  switch (expression) {
    case 'happy':
      return xs.map((x) => stroke(`M${f(x - 4)} ${f(y + 1.5)}Q${f(x)} ${f(y - 4.5)} ${f(x + 4)} ${f(y + 1.5)}`, colors.ink)).join('');
    case 'love':
      return xs.map((x) => heart(x, y, 4.2, '#e5384f')).join('');
    case 'sick':
      return xs.map((x) => eye('sleepy', x, y, colors.ink)).join('');
    case 'shy':
      return xs.map((x) => eye(input.eyes, x - 1.2, y + 1.2, colors.ink)).join('');
    case 'thinking':
      return xs.map((x) => eye(input.eyes === 'sleepy' ? 'dot' : input.eyes, x + 1.4, y - 1.6, colors.ink)).join('');
    default:
      return xs.map((x) => eye(input.eyes, x, y, colors.ink)).join('');
  }
}

function browsFor(input: FaceInput, cx: number, y: number): string {
  const { expression, colors, spread } = input;
  const by = y - 7.5;
  const l = cx - spread;
  const r = cx + spread;
  switch (expression) {
    case 'mad':
      return stroke(`M${f(l - 5)} ${f(by - 1.5)}L${f(l + 4)} ${f(by + 2)}M${f(r + 5)} ${f(by - 1.5)}L${f(r - 4)} ${f(by + 2)}`, colors.ink);
    case 'sad':
      return stroke(`M${f(l - 5)} ${f(by + 1.5)}L${f(l + 4)} ${f(by - 1.5)}M${f(r + 5)} ${f(by + 1.5)}L${f(r - 4)} ${f(by - 1.5)}`, colors.ink);
    case 'thinking':
      return stroke(`M${f(r - 3)} ${f(by - 1.5)}Q${f(r + 1.5)} ${f(by - 4)} ${f(r + 5)} ${f(by - 1)}`, colors.ink);
    default:
      return '';
  }
}

function mouthFor(input: FaceInput, cx: number, y: number): string {
  const { colors } = input;
  const ink = colors.ink;
  const kind = (
    {
      idle: input.mouth,
      happy: 'grin',
      love: 'smile',
      sad: 'frown',
      mad: 'tight',
      shy: 'wavy',
      sick: 'zigzag',
      thinking: 'side',
    } as const
  )[input.expression];

  switch (kind) {
    case 'smile':
      return stroke(`M${f(cx - 6)} ${f(y)}Q${f(cx)} ${f(y + 6)} ${f(cx + 6)} ${f(y)}`, ink);
    case 'grin':
      return `<path d="M${f(cx - 7)} ${f(y - 1)}Q${f(cx)} ${f(y - 2)} ${f(cx + 7)} ${f(y - 1)}Q${f(cx + 6)} ${f(y + 9)} ${f(cx)} ${f(y + 9)}Q${f(cx - 6)} ${f(y + 9)} ${f(cx - 7)} ${f(y - 1)}Z" fill="${ink}" stroke="${ink}" stroke-width="1.2" stroke-linejoin="round"/>` +
        `<ellipse cx="${f(cx)}" cy="${f(y + 6.4)}" rx="3.6" ry="2" fill="${colors.cheek}"/>`;
    case 'o':
      return `<ellipse cx="${f(cx)}" cy="${f(y + 2)}" rx="2.6" ry="3.3" fill="${ink}"/>`;
    case 'cat':
      return stroke(`M${f(cx - 6)} ${f(y)}Q${f(cx - 3)} ${f(y + 4.5)} ${f(cx)} ${f(y + 0.5)}Q${f(cx + 3)} ${f(y + 4.5)} ${f(cx + 6)} ${f(y)}`, ink);
    case 'flat':
      return stroke(`M${f(cx - 4.5)} ${f(y + 1.5)}H${f(cx + 4.5)}`, ink);
    case 'tongue':
      return `<path d="M${f(cx + 0.5)} ${f(y + 3.6)}q0 4.2 3 4.2t3-4.2z" fill="${colors.cheek}" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>` +
        stroke(`M${f(cx - 6)} ${f(y)}Q${f(cx)} ${f(y + 6)} ${f(cx + 6)} ${f(y)}`, ink);
    case 'frown':
      return stroke(`M${f(cx - 6)} ${f(y + 4)}Q${f(cx)} ${f(y - 2)} ${f(cx + 6)} ${f(y + 4)}`, ink);
    case 'tight':
      return stroke(`M${f(cx - 4.5)} ${f(y + 3)}Q${f(cx)} ${f(y)} ${f(cx + 4.5)} ${f(y + 3)}`, ink);
    case 'wavy':
      return stroke(`M${f(cx - 4)} ${f(y + 2)}q2-2 4 0t4 0`, ink, 2.2);
    case 'zigzag':
      return stroke(`M${f(cx - 7)} ${f(y + 2)}l2.4-2 2.4 2 2.4-2 2.4 2 2.4-2`, ink, 2.2);
    case 'side':
      return stroke(`M${f(cx + 1)} ${f(y + 2.5)}L${f(cx + 7)} ${f(y + 0.5)}`, ink);
  }
}

export function face(input: FaceInput): FaceParts {
  const { body, colors, extra, expression, spread } = input;
  const cx = body.centroid.x;
  const sp = input.family.decorate?.(input.shape, body, colors, body.centroid.y - 3) ?? {};
  const eyeY = body.centroid.y - 3 + (sp.faceDy ?? 0);
  const mouthY = body.centroid.y + 8 + (sp.faceDy ?? 0) + (sp.mouthDy ?? 0);
  const { box, crown: top } = body;
  const eyeAt: [Point, Point] = sp.eyes ?? [{ x: cx - spread, y: eyeY }, { x: cx + spread, y: eyeY }];
  const eyeMid = { x: (eyeAt[0].x + eyeAt[1].x) / 2, y: (eyeAt[0].y + eyeAt[1].y) / 2 };
  const eyeSpread = (eyeAt[1].x - eyeAt[0].x) / 2;
  const worn = accessory(extra, eyeAt, top, colors);

  let behind = sp.behind ?? '';
  let skin = sp.skin ?? '';
  let front = '';

  const showBlush = extra === 'blush' || expression === 'shy' || expression === 'love';
  if (showBlush) {
    const o = expression === 'shy' ? 0.8 : 0.55;
    for (const x of [cx - spread - 4.5, cx + spread + 4.5]) {
      front += `<ellipse cx="${f(x)}" cy="${f(eyeY + 7)}" rx="4.2" ry="2.6" fill="${colors.cheek}" opacity="${o}"/>`;
    }
  }

  if (extra === 'freckles') {
    for (const x of [cx - spread, cx + spread]) {
      for (const [dx, dy] of [[-2.6, 6.5], [0.4, 7.6], [2.8, 6.2]] as const) {
        front += `<circle cx="${f(x + dx)}" cy="${f(eyeY + dy)}" r="0.9" fill="${colors.shade}"/>`;
      }
    }
  }

  if (extra === 'antenna') {
    behind += stroke(`M${f(top.x)} ${f(top.y + 4)}Q${f(top.x + 2)} ${f(top.y - 4)} ${f(top.x + 5)} ${f(top.y - 9)}`, colors.shade, 2);
    behind += `<circle cx="${f(top.x + 5)}" cy="${f(top.y - 9.5)}" r="3.2" fill="${colors.shade}"/>`;
  }

  if (extra === 'sprout') {
    const x = top.x;
    const y = top.y + 1;
    behind += stroke(`M${f(x)} ${f(y + 3)}V${f(y - 6)}`, '#3f8f4e', 2);
    behind += `<path d="M${f(x)} ${f(y - 5)}c-1-4.5-5.5-6-9-5 .6 4 4.2 6 9 5z" fill="#5cb85c"/>`;
    behind += `<path d="M${f(x)} ${f(y - 6.5)}c1-4 4.6-5.5 7.6-4.4-.6 3.6-3.8 5.2-7.6 4.4z" fill="#7bd389"/>`;
  }

  if (extra === 'shine') {
    skin += `<ellipse cx="${f(box.x + box.w * 0.27)}" cy="${f(box.y + box.h * 0.24)}" rx="${f(box.w * 0.09)}" ry="${f(box.h * 0.05)}" transform="rotate(-35 ${f(box.x + box.w * 0.27)} ${f(box.y + box.h * 0.24)})" fill="#fff" opacity="0.45"/>`;
  }

  if (expression === 'sick') {
    const id = `${input.uid}s`;
    skin += `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fc46f" stop-opacity=".7"/><stop offset="1" stop-color="#5fc46f" stop-opacity="0"/></linearGradient>`;
    skin += `<rect class="fx" x="0" y="${f(box.y)}" width="100" height="${f(eyeY + 6 - box.y)}" fill="url(#${id})"/>`;
    front += `<path d="M${f(cx + spread + 7)} ${f(eyeY - 11)}c2 3 3.2 4.6 3.2 6a3.2 3.2 0 0 1-6.4 0c0-1.4 1.2-3 3.2-6z" fill="#8fd3ff" stroke="${colors.ink}" stroke-width="1"/>`;
  }

  if (expression === 'mad') {
    skin += `<rect class="fx" x="0" y="0" width="100" height="100" fill="#ff2d2d" opacity="0.12"/>`;
  }

  if (expression === 'thinking') {
    const x = Math.min(89, box.x + box.w - 1);
    const y = box.y + 6;
    front += `<circle cx="${f(x - 9)}" cy="${f(y + 7)}" r="1.4" fill="${colors.shade}"/><circle cx="${f(x - 5)}" cy="${f(y + 2.5)}" r="2" fill="${colors.shade}"/><circle cx="${f(x)}" cy="${f(y - 3)}" r="2.8" fill="${colors.shade}"/>`;
  }

  return {
    behind,
    skin,
    eyes: eyesFor(input, eyeAt),
    brows: browsFor({ ...input, spread: eyeSpread }, eyeMid.x, eyeMid.y),
    mouth: `<g transform="translate(${f(cx)} ${f(mouthY + 2)}) scale(${f(input.mouthScale)}) translate(${f(-cx)} ${f(-(mouthY + 2))})">${mouthFor(input, cx, mouthY)}</g>`,
    front,
    top: (sp.over ?? '') + worn.top,
    wear: worn.wear,
  };
}
