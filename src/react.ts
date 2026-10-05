'use client';

import { createElement, useEffect, useLayoutEffect, useRef, type HTMLAttributes, type ReactElement } from 'react';
import { mochikao, mochikaoImage, rendersAsImage, type MochikaoOptions } from './index.ts';
import { morphTo } from './morph.ts';

export type MochikaoProps = Omit<MochikaoOptions, 'gaze'> &
  Omit<HTMLAttributes<HTMLElement>, 'children' | 'dangerouslySetInnerHTML' | 'title'> & {
    /** Force le SVG en ligne même sans animation (pour le styler en CSS, par exemple). */
    inline?: boolean;
  };

const BASE = { display: 'inline-block', verticalAlign: 'middle', lineHeight: 0 } as const;

// useLayoutEffect évite un flash avant peinture ; côté serveur il ne sert à rien.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * <Mochikao name="alex" size={48} animate="hover" />
 * Rend un <img> quand rien n'est animé, sinon le SVG en ligne. En SVG en ligne,
 * un changement d'expression est animé (voir mochikao/morph).
 */
export function Mochikao(props: MochikaoProps): ReactElement {
  const {
    name, size, background, hue, tone, saturation, color, expression, animate,
    family, shape, eyes, mouth, extra, traits, title, inline, style, ...rest
  } = props;
  const options = { name, size, background, hue, tone, saturation, color, expression, animate, family, shape, eyes, mouth, extra, traits, title };
  const asImage = rendersAsImage({ ...options, inline });
  const svg = asImage ? '' : mochikao(options);

  const ref = useRef<HTMLSpanElement>(null);
  // React ne pose le SVG qu'à l'apparition du <span> ; ensuite c'est morphTo()
  // qui le remplace, pour pouvoir animer la transition. Ce HTML ne change donc
  // plus tant que le <span> vit, et React ne touche plus à son contenu.
  const initial = useRef<string | null>(null);
  if (asImage) initial.current = null;
  else initial.current ??= svg;

  useIsoLayoutEffect(() => {
    if (ref.current && svg) morphTo(ref.current, svg);
  }, [svg]);

  if (asImage) {
    return createElement('img', { ...rest, ...mochikaoImage(options), style: { ...BASE, ...style } });
  }
  return createElement('span', {
    ...rest,
    ref,
    style: { ...BASE, ...style },
    // Sûr : mochikao() échappe le nom et valide toutes les autres options.
    dangerouslySetInnerHTML: { __html: initial.current },
  });
}
