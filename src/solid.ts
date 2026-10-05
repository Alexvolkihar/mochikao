import { createComponent, createEffect, createMemo, mergeProps, on, splitProps, untrack, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { mochikao, mochikaoImage, rendersAsImage, type MochikaoOptions } from './index.ts';
import { morphTo } from './morph.ts';

export type MochikaoProps = Omit<MochikaoOptions, 'gaze'> &
  Omit<JSX.HTMLAttributes<HTMLElement>, 'children' | 'innerHTML' | 'textContent' | 'title'> & {
    /** Force le SVG en ligne même sans animation. */
    inline?: boolean;
  };

const OPTIONS = [
  'name', 'size', 'background', 'hue', 'tone', 'saturation', 'color', 'expression', 'animate',
  'family', 'shape', 'eyes', 'mouth', 'extra', 'traits', 'title',
] as const;

const BASE = { display: 'inline-block', 'vertical-align': 'middle', 'line-height': '0' };

/**
 * <Mochikao name="alex" size={48} animate="hover" />
 * Rend un <img> quand rien n'est animé, sinon le SVG en ligne. En SVG en ligne,
 * un changement d'expression est animé (voir mochikao/morph).
 * Écrit sans JSX pour ne pas imposer le plugin Babel de Solid. Les props ne
 * sont jamais déstructurées : chaque option reste réactive.
 */
export function Mochikao(props: MochikaoProps): JSX.Element {
  const [options, own, rest] = splitProps(props, OPTIONS, ['style', 'inline', 'ref']);
  const style = () => {
    const s = own.style;
    if (typeof s === 'string') return `display:inline-block;vertical-align:middle;line-height:0;${s}`;
    return { ...BASE, ...s };
  };
  const asImage = createMemo(() => rendersAsImage({ ...options, inline: own.inline }));
  const image = createMemo(() => (asImage() ? mochikaoImage(options) : undefined));

  const span = () => {
    // Solid ne pose le SVG qu'à la création du <span> (valeur figée) ; ensuite
    // c'est morphTo() qui le remplace, pour pouvoir animer la transition.
    const initial = untrack(() => mochikao(options));
    let el: HTMLElement | undefined;
    createEffect(on(() => mochikao(options), (next) => el && morphTo(el, next), { defer: true }));
    return createComponent(
      Dynamic,
      mergeProps(rest, {
        component: 'span',
        ref(node: HTMLElement) {
          el = node;
          if (typeof own.ref === 'function') (own.ref as (n: HTMLElement) => void)(node);
        },
        get style() {
          return style();
        },
        // Sûr : mochikao() échappe le nom et valide toutes les autres options.
        innerHTML: initial,
      }),
    );
  };
  const img = () =>
    createComponent(
      Dynamic,
      mergeProps(rest, {
        component: 'img',
        ref(node: HTMLElement) {
          if (typeof own.ref === 'function') (own.ref as (n: HTMLElement) => void)(node);
        },
        get style() {
          return style();
        },
        get src() {
          return image()?.src;
        },
        get width() {
          return image()?.width;
        },
        get height() {
          return image()?.height;
        },
        get alt() {
          return image()?.alt;
        },
      }),
    );

  // createComponent isole ses props : ce memo ne se recalcule qu'au passage img <-> span.
  return createMemo(() => (asImage() ? img() : span())) as unknown as JSX.Element;
}
