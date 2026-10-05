<!--
  <Mochikao name="alex" size={48} animate="hover" />
  Rend un <img> quand rien n'est animé, sinon le SVG en ligne. En SVG en ligne,
  un changement d'expression est animé (voir mochikao/morph).
  Les autres attributs (class, style, onclick...) sont transmis à l'élément.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { mochikao, mochikaoImage, rendersAsImage, type MochikaoOptions } from 'mochikao';
  import { morphTo } from 'mochikao/morph';
  import type { HTMLAttributes } from 'svelte/elements';

  type Props = Omit<MochikaoOptions, 'gaze'> &
    Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> & {
      /** Force le SVG en ligne même sans animation. */
      inline?: boolean;
    };

  let {
    name, size, background, hue, tone, saturation, color, expression, animate,
    family, shape, eyes, mouth, extra, traits, title, inline = false, style = '', ...rest
  }: Props = $props();

  const options = $derived({ name, size, background, hue, tone, saturation, color, expression, animate, family, shape, eyes, mouth, extra, traits, title });
  const asImage = $derived(rendersAsImage({ ...options, inline }));
  const svg = $derived(asImage ? '' : mochikao(options));
  const css = $derived(`display:inline-block;vertical-align:middle;line-height:0;${style ?? ''}`);

  // Svelte ne pose le SVG qu'à l'apparition du <span> (untrack) ; ensuite
  // c'est morphTo() qui le remplace, pour pouvoir animer la transition.
  function morph(node: HTMLElement, value: string) {
    return {
      update(next: string) {
        morphTo(node, next);
      },
    };
  }
</script>

{#if asImage}
  {@const img = mochikaoImage(options)}
  <img {...rest} src={img.src} width={img.width} height={img.height} alt={img.alt} style={css} />
{:else}
  <!-- Sûr : mochikao() échappe le nom et valide toutes les autres options. -->
  <span {...rest} style={css} use:morph={svg}>{@html untrack(() => svg)}</span>
{/if}
