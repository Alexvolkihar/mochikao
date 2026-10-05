type Rgb = [number, number, number];

export interface Palette {
  body: string;
  shade: string;
  ink: string;
  cheek: string;
  bg: string;
  /** Contraste réel encre / corps, toujours >= 4.5. */
  contrast: number;
}

const MIN_CONTRAST = 4.5;

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)];
}

/** Arrondi 8 bits : le contraste est mesuré sur la couleur réellement émise. */
const quantize = ([r, g, b]: Rgb): Rgb => [Math.round(r * 255) / 255, Math.round(g * 255) / 255, Math.round(b * 255) / 255];

export function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function toHex([r, g, b]: Rgb): string {
  const h = (c: number) => Math.round(c * 255).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/**
 * Palette d'un avatar. La luminosité du corps est ajustée jusqu'à ce que
 * l'encre (sombre ou claire) atteigne 4.5:1, quelle que soit la teinte.
 */
export function palette(hue: number, tone = 0.5, saturation = 0.74): Palette {
  const h = ((hue % 360) + 360) % 360;
  const t = Math.min(1, Math.max(0, tone));
  const s = Math.max(8, Math.min(1, saturation) * 100);
  const dark = quantize(hslToRgb(h, 45, 12));
  const light = quantize(hslToRgb(h, 60, 97));
  const step = t >= 0.35 ? 1.5 : -1.5;

  let l = 30 + t * 55;
  for (let i = 0; i < 60; i++) {
    const body = quantize(hslToRgb(h, s, l));
    const cd = contrast(body, dark);
    const cl = contrast(body, light);
    const useDark = cd >= cl;
    const best = useDark ? cd : cl;
    if (best >= MIN_CONTRAST || l <= 5 || l >= 95) {
      return {
        body: toHex(body),
        shade: toHex(hslToRgb(h, Math.min(100, s + 6), Math.max(0, l - 12))),
        ink: toHex(useDark ? dark : light),
        cheek: toHex(hslToRgb(350, 85, useDark ? 68 : 62)),
        bg: toHex(hslToRgb((h + 28) % 360, 65, useDark ? 91 : 22)),
        contrast: best,
      };
    }
    l += step;
  }
  throw new Error('unreachable');
}
