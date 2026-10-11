# Building an avatar editor

**English** · [Français](editor.fr.md)

mochikao ships no editor UI, on purpose: the look of a picker belongs to your app. What it gives you is everything an editor needs, and the model is small.

> An avatar is **`name` + pinned options**. Anything you don't pin is drawn from the name.

So an editor is a form over a plain object (the *prefs*) that you store and pass back as options. This page covers the model, the few places that need care, and a framework-free reference you can adapt. A React version is in the [README](../README.md#letting-users-customize-their-avatar).

## 1. The model

```ts
import type { MochikaoOptions } from 'mochikao';

// What you store per user. Only keys the user touched are present.
type Prefs = Omit<MochikaoOptions, 'name' | 'family'>;

// Render it
mochikao({ name: user.id, family, ...prefs });
```

- **Pinned** = the key exists in `prefs`. **Auto** = the key is absent. Never store `undefined`, `null` or `''`: delete the key (`mochikao` ignores `undefined`, but your JSON and your diffs stay cleaner).
- Use a **stable ID** as `name`, not a pseudonym the user can rename.
- Keep `family` outside `prefs`: it is a choice you make for the whole app (or one the user makes, see below), and it is an object, not a string.

## 2. What to offer

| Control | Option | Choices |
| --- | --- | --- |
| Shape | `shape` | `family.shapes` (`blobs`, `animals`, `produce`, or `mix(...)`) |
| Eyes | `eyes` | `EYES` |
| Mouth | `mouth` | `MOUTHS` |
| Accessory | `extra` | `EXTRAS` |
| Color | `color` | `Object.keys(COLORS)`: a tone + saturation preset |
| Hue | `hue` | 0–360 (slider) |
| Fine tuning | `traits.<axis>` | 0–1 sliders, one per `CONTINUOUS_AXES` entry |
| Mood | `expression` | `EXPRESSIONS` (usually app state, not a stored preference) |

All lists are exported from `mochikao`. You can offer only some of these: the fewer traits people can pin, the more two users still differ.

## 3. Show what "auto" means

A control reading just "auto" is not helpful. `resolve()` returns what the name gives, without drawing:

```ts
import { resolve } from 'mochikao';

const auto = resolve({ name: user.id, family });
auto.shape;       // 'frog'
auto.eyes;        // 'sleepy'
auto.hue;         // 140, already adjusted for families with a natural hue
auto.traits.lean; // 0.62, the default position of that slider
```

Use it for the label of the "auto" option (`auto (sleepy)`) and for where a slider starts. Resolve with the **current prefs** if you want values that follow what's already pinned (for example a hue that stays consistent with a pinned `shape: 'lemon'`).

## 4. The places that need care

**Changing family drops shapes that no longer exist.** A pinned `shape: 'frog'` means nothing in `blobs`:

```ts
function withFamily(prefs: Prefs, family: ShapeFamily): Prefs {
  const { shape, ...rest } = prefs;
  return shape && family.shapes.includes(shape) ? prefs : rest;
}
```

**Fruits and vegetables carry a natural hue** (a lemon is yellow). The name only nudges it by ±12°. If the user drags the hue slider, they pin it and it overrides that. Offer a "reset" so they can go back to the natural color.

**`color` and `tone`/`saturation`.** `color: 'pastel'` is a shortcut for a tone + saturation pair; an explicit `tone` or `saturation` wins over it. When the user picks a preset, delete their explicit `tone`/`saturation`, otherwise the preset seems to do nothing.

**Continuous axes live under `traits`.** Merge, don't replace:

```ts
const setAxis = (p: Prefs, axis: (typeof CONTINUOUS_AXES)[number], v: number): Prefs =>
  ({ ...p, traits: { ...p.traits, [axis]: v } });
```

**"Shuffle" is a different name, not a different seed.** There is no random option on purpose (same input, same output). To let people roll the dice, keep a *variant* string and render `name: `${user.id}:${variant}``. Store the variant with the prefs.

## 5. A framework-free reference

The reducers are plain functions, so the same core works in React, Vue, Svelte, Solid or vanilla JS. Only the rendering differs.

```ts
import { CONTINUOUS_AXES, COLORS, EXTRAS, EYES, MOUTHS, mochikao, resolve, blobs, mix, type MochikaoOptions, type ShapeFamily } from 'mochikao';
import { animals } from 'mochikao/animals';
import { toParams, parseParams } from 'mochikao/params';

type Prefs = Omit<MochikaoOptions, 'name' | 'family'>;
type Choice = 'shape' | 'eyes' | 'mouth' | 'extra';

const family: ShapeFamily = mix(blobs, animals);

// --- pure state transitions: same in every framework --------------------

export const pin = (p: Prefs, key: Choice, value: string): Prefs => ({ ...p, [key]: value });

export function unpin(p: Prefs, key: Choice | 'hue' | 'color'): Prefs {
  const { [key]: _removed, ...rest } = p;
  return rest;
}

export function setColor(p: Prefs, color: keyof typeof COLORS): Prefs {
  const { tone: _t, saturation: _s, ...rest } = p;
  return { ...rest, color };
}

export function setAxis(p: Prefs, axis: (typeof CONTINUOUS_AXES)[number], value: number): Prefs {
  return { ...p, traits: { ...p.traits, [axis]: value } };
}

// --- persistence ---------------------------------------------------------

export const serialize = (p: Prefs) => toParams({ name: '', family: undefined, ...p }).toString();
export const load = (id: string, text: string) => {
  const { name: _n, family: _f, size: _s, ...prefs } = parseParams(id, new URLSearchParams(text), [animals]);
  return prefs as Prefs; // invalid values were dropped by parseParams
};

// --- rendering (vanilla) ---------------------------------------------------

export function render(root: HTMLElement, id: string, prefs: Prefs, onChange: (next: Prefs) => void) {
  const auto = resolve({ name: id, family, ...prefs });
  const choices: Record<Choice, readonly string[]> = { shape: family.shapes, eyes: EYES, mouth: MOUTHS, extra: EXTRAS };

  const selects = (Object.keys(choices) as Choice[]).map((key) => {
    const options = [`<option value="">auto (${auto[key]})</option>`, ...choices[key].map((v) => `<option${prefs[key] === v ? ' selected' : ''}>${v}</option>`)];
    return `<label>${key} <select data-key="${key}">${options.join('')}</select></label>`;
  });

  root.innerHTML = `${mochikao({ name: id, family, size: 128, ...prefs })}${selects.join('')}`;
  root.querySelectorAll<HTMLSelectElement>('select').forEach((el) => {
    el.onchange = () => onChange(el.value ? pin(prefs, el.dataset.key as Choice, el.value) : unpin(prefs, el.dataset.key as Choice));
  });
}
```

`serialize` and `load` round-trip through the same `toParams` / `parseParams` pair as the HTTP API, so a stored string can be appended to `/api/<id>.svg?` to get the same avatar anywhere.

### Vue 3 (`<script setup>`)

The same model as a single-file component: `prefs` is a `v-model`, and the form emits a new object on each change. It uses `mochikao/vue` for the avatar.

```vue
<!-- AvatarEditor.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { Mochikao } from 'mochikao/vue';
import { EYES, MOUTHS, EXTRAS, resolve, mix, blobs, type MochikaoOptions } from 'mochikao';
import { animals } from 'mochikao/animals';

type Prefs = Omit<MochikaoOptions, 'name' | 'family'>;

const family = mix(blobs, animals);
const CHOICES = { shape: family.shapes, eyes: EYES, mouth: MOUTHS, extra: EXTRAS } as const;
type Key = keyof typeof CHOICES;
const KEYS = Object.keys(CHOICES) as Key[];

const props = defineProps<{ userId: string; modelValue: Prefs }>();
const emit = defineEmits<{ 'update:modelValue': [prefs: Prefs]; save: [prefs: Prefs] }>();

const auto = computed(() => resolve({ name: props.userId, family, ...props.modelValue }));

function pin(key: Key, value: string) {
  const { [key]: _removed, ...rest } = props.modelValue;
  emit('update:modelValue', value ? { ...rest, [key]: value } : rest);
}

function setHue(hue: number) {
  emit('update:modelValue', { ...props.modelValue, hue });
}
</script>

<template>
  <Mochikao :name="userId" :family="family" :size="128" v-bind="modelValue" />

  <label v-for="key in KEYS" :key="key">
    {{ key }}
    <select :value="modelValue[key] ?? ''" @change="pin(key, ($event.target as HTMLSelectElement).value)">
      <option value="">auto ({{ auto[key] }})</option>
      <option v-for="v in CHOICES[key]" :key="v">{{ v }}</option>
    </select>
  </label>

  <label>
    hue
    <input type="range" min="0" max="360" :value="modelValue.hue ?? auto.hue"
           @input="setHue(+($event.target as HTMLInputElement).value)" />
  </label>

  <button @click="emit('save', modelValue)">Save</button>
  <button @click="emit('update:modelValue', {})">Reset</button>
</template>
```

```vue
<script setup lang="ts">
import { ref } from 'vue';
import AvatarEditor from './AvatarEditor.vue';

const prefs = ref(user.avatarPrefs);              // from your API
</script>

<template>
  <AvatarEditor :user-id="user.id" v-model="prefs" @save="api.saveAvatar" />
</template>
```

Anywhere else, display it with the same two lines: `family` from your theme, then `v-bind="user.avatarPrefs"`.

## 6. Previews

A tile in a picker is the same avatar with one option changed:

```ts
const tile = (key: Choice, value: string) =>
  mochikao({ name: id, family, size: 46, ...prefs, [key]: value });
```

For eyes and mouth, 46 px is small: crop the `viewBox` to the face (`viewBox="22 28 56 56"`) before inserting the SVG. For long lists of tiles, use `mochikaoDataUri` in an `<img>` rather than inline SVG.

## 7. Validate on the server

Prefs come from a client, so don't trust them. Reading them through `parseParams` drops anything that isn't a known value and clamps numbers, so the stored result is always something `mochikao()` can render:

```ts
const safe = parseParams(user.id, new URLSearchParams(body.prefs), [animals]);
```

## 8. Accessibility and states

- Give the avatar a meaningful `title` (it becomes `aria-label`), for example the user's display name.
- Pickers of faces are visual: label each tile with the option name, not only the picture, and keep a text `<select>` fallback like the one above.
- `expression` is best driven by app state (`thinking` while saving, `happy` after) and kept out of prefs.
- `animate: 'hover'` respects `prefers-reduced-motion` automatically.

## Reference

The project's own editor ([`site/editor.ts`](../site/editor.ts), live at [mochikao.alexvolkihar.ovh/editor.html](https://mochikao.alexvolkihar.ovh/editor.html)) is a complete implementation of this model: locks for pinned traits, tiles per option, sliders per axis and generated code snippets.
