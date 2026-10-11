<!--
  Complete avatar editor, in the spirit of the one on the mochikao site:
  family modes, a tile per option, locked sliders, color presets, mood, share link.

  Copy this file into a Vue 3 project that has `mochikao` installed:

    <AvatarEditor user-id="alex" v-model="prefs" @save="saveToYourApi" />

  `prefs` is the only thing to store: only the keys the user pinned are present.

  Contrast: mochikao guarantees eyes/mouth against the body (>= 4.5:1). It does NOT
  guarantee the avatar against YOUR page. See docs/editor.md, "Contrast and accessibility".
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { Mochikao } from 'mochikao/vue';
import { toParams } from 'mochikao/params';
import { animals } from 'mochikao/animals';
import { produce } from 'mochikao/produce';
import {
  BACKGROUNDS, COLORS, CONTINUOUS_AXES, EXPRESSIONS, EXTRAS, EYES, MOUTHS,
  blobs, mix, mochikaoDataUri, resolve,
  type Background, type ColorPreset, type Expression, type MochikaoOptions, type ShapeFamily, type Traits,
} from 'mochikao';

// What gets stored. `family` is stored by its name (see `mode` below).
export type Prefs = Pick<MochikaoOptions, 'shape' | 'eyes' | 'mouth' | 'extra' | 'color' | 'hue' | 'tone' | 'saturation' | 'traits'>;
type Choice = 'shape' | 'eyes' | 'mouth' | 'extra';
type Axis = (typeof CONTINUOUS_AXES)[number];

const props = defineProps<{ userId: string; modelValue: Prefs; mode?: string }>();
const emit = defineEmits<{
  'update:modelValue': [prefs: Prefs];
  'update:mode': [mode: string];
  save: [payload: { prefs: Prefs; mode: string; variant: string }];
}>();

// --- modes: one family, or any combination ------------------------------

const MODES: Record<string, ShapeFamily> = Object.fromEntries(
  [blobs, animals, produce, mix(blobs, animals), mix(blobs, produce), mix(animals, produce), mix(blobs, animals, produce)]
    .map((f) => [f.name, f]),
);
const modeKey = computed(() => (props.mode && props.mode in MODES ? props.mode : 'blob'));
const family = computed(() => MODES[modeKey.value]!);

// --- local, unsaved state ------------------------------------------------

const variant = ref('');                  // "shuffle" changes this, not the user id
const expression = ref<Expression>('idle');
const background = ref<Background>('none');
const name = computed(() => (variant.value ? `${props.userId}:${variant.value}` : props.userId));

// Everything the preview renders with.
const options = computed<MochikaoOptions>(() => ({
  name: name.value, family: family.value, ...props.modelValue, expression: expression.value, background: background.value,
}));
const auto = computed(() => resolve({ name: name.value, family: family.value }));     // what the name gives
const current = computed(() => resolve({ name: name.value, family: family.value, ...props.modelValue }));

// --- state transitions: plain functions, no framework in them ---------------

const set = (next: Prefs) => emit('update:modelValue', next);

function pin(key: Choice, value: string | undefined) {
  const { [key]: _removed, ...rest } = props.modelValue;
  set(value ? { ...rest, [key]: value } : rest);
}

function setMode(next: string) {
  emit('update:mode', next);
  // A pinned shape from another family means nothing here.
  const shape = props.modelValue.shape;
  if (shape && !MODES[next]!.shapes.includes(shape)) pin('shape', undefined);
}

function setColor(color: ColorPreset | undefined) {
  const { color: _c, tone: _t, saturation: _s, ...rest } = props.modelValue;
  set(color ? { ...rest, color } : rest);   // an explicit tone/saturation would win over the preset
}

const isPinned = (key: 'hue' | 'tone' | 'saturation' | Axis) =>
  (CONTINUOUS_AXES as readonly string[]).includes(key) ? props.modelValue.traits?.[key as Axis] !== undefined : props.modelValue[key as 'hue'] !== undefined;

function setNumber(key: 'hue' | 'tone' | 'saturation' | Axis, value: number) {
  if ((CONTINUOUS_AXES as readonly string[]).includes(key)) set({ ...props.modelValue, traits: { ...props.modelValue.traits, [key]: value } });
  else set({ ...props.modelValue, [key]: value });
}

function unpinNumber(key: 'hue' | 'tone' | 'saturation' | Axis) {
  if ((CONTINUOUS_AXES as readonly string[]).includes(key)) {
    const { [key as Axis]: _a, ...traits } = props.modelValue.traits ?? {};
    const { traits: _t, ...rest } = props.modelValue;
    set(Object.keys(traits).length ? { ...rest, traits } : rest);
  } else {
    const { [key as 'hue']: _a, ...rest } = props.modelValue;
    set(rest);
  }
}

// --- what each control shows -------------------------------------------------

const CHOICES = computed<Record<Choice, readonly string[]>>(() => ({
  shape: family.value.shapes, eyes: EYES, mouth: MOUTHS, extra: EXTRAS,
}));
const CHOICE_KEYS = ['shape', 'eyes', 'mouth', 'extra'] as const;

const SLIDERS: { title: string; items: { id: 'hue' | 'tone' | 'saturation' | Axis; min: number; max: number; step: number }[] }[] = [
  { title: 'Body', items: (['bodySize', 'proportion', 'squareness', 'wobble'] as const).map((id) => ({ id, min: 0, max: 1, step: 0.01 })) },
  { title: 'Eyes', items: (['eyeSize', 'spacing', 'lean', 'gazeX', 'gazeY'] as const).map((id) => ({ id, min: 0, max: 1, step: 0.01 })) },
  { title: 'Mouth', items: [{ id: 'mouthSize', min: 0, max: 1, step: 0.01 }] },
  { title: 'Color', items: [{ id: 'hue', min: 0, max: 360, step: 1 }, { id: 'tone', min: 0, max: 1, step: 0.01 }, { id: 'saturation', min: 0, max: 1, step: 0.01 }] },
];

function valueOf(id: 'hue' | 'tone' | 'saturation' | Axis): number {
  if (id === 'hue') return props.modelValue.hue ?? current.value.hue;
  if (id === 'tone') return props.modelValue.tone ?? (props.modelValue.color ? COLORS[props.modelValue.color].tone : 0.5);
  if (id === 'saturation') return props.modelValue.saturation ?? (props.modelValue.color ? COLORS[props.modelValue.color].saturation : 0.74);
  return current.value.traits[id as keyof Traits];
}

// A tile is the same avatar with one option changed.
const thumb = (override: Partial<MochikaoOptions>) => mochikaoDataUri({ ...options.value, expression: 'idle', background: 'none', size: 46, ...override });

// Same params as the HTTP API: paste after /api/<id>.svg?
const shareQuery = computed(() => {
  const { name: _n, ...rest } = options.value;
  return toParams({ name: '', ...rest }).toString();
});

const shuffle = () => (variant.value = Math.random().toString(36).slice(2, 6));
const reset = () => { variant.value = ''; expression.value = 'idle'; background.value = 'none'; set({}); };
</script>

<template>
  <div class="editor">
    <aside class="preview">
      <Mochikao v-bind="options" :size="192" animate="hover" gaze :title="`Avatar of ${userId}`" />
      <p class="muted">{{ family.name }} · {{ current.shape }}</p>

      <div class="row">
        <button type="button" @click="shuffle">Shuffle</button>
        <button type="button" @click="reset">Reset</button>
        <button type="button" @click="emit('save', { prefs: modelValue, mode: modeKey, variant })">Save</button>
      </div>

      <label>Mood
        <select v-model="expression"><option v-for="e in EXPRESSIONS" :key="e">{{ e }}</option></select>
      </label>
      <label>Background
        <select v-model="background"><option v-for="b in BACKGROUNDS" :key="b">{{ b }}</option></select>
      </label>

      <code class="share">/api/{{ userId }}.svg?{{ shareQuery }}</code>
    </aside>

    <section class="panel">
      <h3>Family</h3>
      <div class="tiles">
        <button v-for="(f, key) in MODES" :key="key" type="button" :class="{ on: key === modeKey }" :aria-pressed="key === modeKey" @click="setMode(String(key))">
          <img :src="thumb({ family: f, shape: undefined })" alt="" width="46" height="46" />
          {{ f.name.replaceAll('+', ' + ') }}
        </button>
      </div>

      <template v-for="key in CHOICE_KEYS" :key="key">
        <h3>{{ key }}</h3>
        <div class="tiles">
          <button type="button" :class="{ on: modelValue[key] === undefined }" :aria-pressed="modelValue[key] === undefined" @click="pin(key, undefined)">
            <img :src="thumb({ [key]: undefined })" alt="" width="46" height="46" />
            auto · {{ auto[key] }}
          </button>
          <button v-for="v in CHOICES[key]" :key="v" type="button" :class="{ on: modelValue[key] === v }" :aria-pressed="modelValue[key] === v" @click="pin(key, v)">
            <img :src="thumb({ [key]: v })" alt="" width="46" height="46" />
            {{ v }}
          </button>
        </div>
      </template>

      <h3>Color preset</h3>
      <div class="tiles">
        <button type="button" :class="{ on: !modelValue.color }" :aria-pressed="!modelValue.color" @click="setColor(undefined)">auto</button>
        <button v-for="(_, c) in COLORS" :key="c" type="button" :class="{ on: modelValue.color === c }" :aria-pressed="modelValue.color === c" @click="setColor(c)">{{ c }}</button>
      </div>

      <template v-for="group in SLIDERS" :key="group.title">
        <h3>{{ group.title }}</h3>
        <div v-for="s in group.items" :key="s.id" class="slider" :class="{ pinned: isPinned(s.id) }">
          <label :for="`s-${s.id}`">{{ s.id }}</label>
          <input :id="`s-${s.id}`" type="range" :min="s.min" :max="s.max" :step="s.step" :value="valueOf(s.id)"
                 @input="setNumber(s.id, +($event.target as HTMLInputElement).value)" />
          <button type="button" :disabled="!isPinned(s.id)" :aria-label="`${s.id}: back to auto`" @click="unpinNumber(s.id)">
            {{ isPinned(s.id) ? 'pinned ✕' : 'auto' }}
          </button>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.editor { display: grid; grid-template-columns: minmax(220px, 280px) 1fr; gap: 24px; align-items: start; }
.preview { position: sticky; top: 16px; display: grid; gap: 10px; justify-items: start; }
.muted { margin: 0; font-size: .85em; }
.row { display: flex; gap: 8px; }
.share { font-size: .75em; word-break: break-all; }
.tiles { display: flex; flex-wrap: wrap; gap: 8px; }
/* UI boundaries need 3:1 against the page (WCAG 1.4.11): currentColor always has it, a translucent grey does not.
   The selected tile is shown by more than color: thicker border and a check mark. */
.tiles button { display: grid; justify-items: center; gap: 4px; padding: 6px; border: 1px solid currentColor; border-radius: 10px; background: none; color: inherit; font: inherit; cursor: pointer; }
.tiles button.on { padding: 5px; border-width: 2px; font-weight: 600; }
.tiles button.on::after { content: "✓"; }
.tiles button:focus-visible, .slider input:focus-visible { outline: 3px solid currentColor; outline-offset: 2px; }
.slider { display: grid; grid-template-columns: 110px 1fr auto; gap: 10px; align-items: center; margin: 4px 0; }
.slider.pinned label { font-weight: 600; }
h3 { margin: 18px 0 8px; font-size: .8em; text-transform: uppercase; letter-spacing: .06em; }
</style>
