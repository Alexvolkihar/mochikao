import { computed, defineComponent, h, ref, watch, type PropType } from 'vue';
import {
  mochikao, mochikaoImage, rendersAsImage,
  type Animation, type Background, type ColorPreset, type Expression, type ExtraName,
  type EyesName, type MouthName, type ShapeFamily, type Traits,
} from './index.ts';
import { morphTo } from './morph.ts';

const BASE = { display: 'inline-block', verticalAlign: 'middle', lineHeight: 0 };

/**
 * <Mochikao name="alex" :size="48" animate="hover" />
 * Rend un <img> quand rien n'est animé, sinon le SVG en ligne. En SVG en ligne,
 * un changement d'expression est animé (voir mochikao/morph).
 * Les attributs non déclarés (class, style, @click...) tombent sur l'élément racine.
 */
export const Mochikao = defineComponent({
  name: 'Mochikao',
  props: {
    name: { type: String, required: true },
    size: Number,
    background: String as PropType<Background>,
    hue: Number,
    tone: Number,
    saturation: Number,
    color: String as PropType<ColorPreset>,
    expression: String as PropType<Expression>,
    animate: String as PropType<Animation>,
    family: Object as PropType<ShapeFamily>,
    shape: String,
    eyes: String as PropType<EyesName>,
    mouth: String as PropType<MouthName>,
    extra: String as PropType<ExtraName>,
    traits: Object as PropType<Partial<Traits>>,
    title: String,
    /** Force le SVG en ligne même sans animation. */
    inline: Boolean,
  },
  setup(props) {
    const el = ref<HTMLElement>();
    const options = computed(() => {
      const { inline: _, ...o } = props;
      return o;
    });
    const asImage = computed(() => rendersAsImage(props));
    const svg = computed(() => (asImage.value ? '' : mochikao(options.value)));

    // Vue ne pose le SVG qu'à l'apparition du <span> ; ensuite c'est morphTo()
    // qui le remplace. innerHTML reste identique dans le vnode, donc Vue n'y touche plus.
    let initial: string | null = null;
    watch(svg, (next) => {
      if (el.value && next) morphTo(el.value, next);
    }, { flush: 'post' });

    return () => {
      if (asImage.value) {
        initial = null;
        return h('img', { ...mochikaoImage(options.value), style: BASE });
      }
      initial ??= svg.value;
      return h('span', { ref: el, style: BASE, innerHTML: initial });
    };
  },
});

export default Mochikao;
