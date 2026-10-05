import {
  ANIMATIONS, BACKGROUNDS, COLORS, EXPRESSIONS, EXTRAS, EYES, MOUTHS,
  blobs, mochikao, resolve,
  type MochikaoOptions, type ColorPreset, type Traits,
} from '../src/index.ts';
import { morphTo } from '../src/morph.ts';
import { parseParams, toParams } from '../src/params.ts';
import { decorative, initChrome } from './shared/chrome.ts';
import { EXTRA_FAMILIES, FAMILIES, type FamilyName } from './shared/families.ts';
import { label, onLangChange, t, type Key } from './shared/i18n.ts';

type Axis = 'bodySize' | 'proportion' | 'squareness' | 'wobble' | 'eyeSize' | 'spacing' | 'lean' | 'gazeX' | 'gazeY' | 'mouthSize';
type Discrete = 'shape' | 'eyes' | 'mouth' | 'extra';

interface State extends MochikaoOptions {
  traits: Partial<Pick<Traits, Axis>>;
}

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const OTHERS = ['marie', 'kenji', 'lina', 'théo', 'ada', 'oscar', 'yuki', 'zoé', 'samir'];
const SYLLABLES = ['ka', 'lo', 'mi', 'zu', 'ra', 'ne', 'po', 'li', 'sa', 'to', 'yu', 'be', 'no', 'ri', 'fa', 'chi'];
const LOCK = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
const UNLOCK = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M5 7V5a3 3 0 0 1 5.8-1" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';

// --- état : l'URL fait foi, pour qu'un lien redonne exactement la même config ---

function load(): State {
  const q = new URLSearchParams(location.search);
  const o = parseParams(q.get('name') || 'alex', q, EXTRA_FAMILIES);
  delete o.size;
  return { ...o, traits: { ...o.traits } };
}

const state: State = load();

function options(): MochikaoOptions {
  const { traits, ...rest } = state;
  return Object.keys(traits).length ? { ...rest, traits } : rest;
}

function save() {
  const q = toParams(options());
  const query = `?name=${encodeURIComponent(state.name)}${q.size ? `&${q}` : ''}`;
  history.replaceState(null, '', `${location.pathname}${query}${location.hash}`);
}

function pinCount(): number {
  const discrete = (['shape', 'eyes', 'mouth', 'extra', 'color', 'hue', 'tone', 'saturation'] as const).filter((k) => state[k] !== undefined).length;
  return discrete + Object.keys(state.traits).length + (state.family && state.family !== blobs ? 1 : 0);
}

// --- panneau de réglages ---

interface SliderSpec {
  id: Axis | 'hue' | 'tone' | 'saturation';
  max: number;
  step: number;
}

const SECTIONS: { title: Key; grid?: Discrete | 'family' | 'color'; sliders?: SliderSpec[] }[] = [
  { title: 'editor.section.family', grid: 'family' },
  { title: 'editor.section.shape', grid: 'shape' },
  { title: 'editor.section.body', sliders: (['bodySize', 'proportion', 'squareness', 'wobble'] as const).map((id) => ({ id, max: 1, step: 0.001 })) },
  { title: 'editor.section.eyes', grid: 'eyes', sliders: (['eyeSize', 'spacing', 'lean', 'gazeX', 'gazeY'] as const).map((id) => ({ id, max: 1, step: 0.001 })) },
  { title: 'editor.section.mouth', grid: 'mouth', sliders: [{ id: 'mouthSize', max: 1, step: 0.001 }] },
  { title: 'editor.section.color', grid: 'color', sliders: [{ id: 'hue', max: 360, step: 1 }, { id: 'tone', max: 1, step: 0.01 }, { id: 'saturation', max: 1, step: 0.01 }] },
  { title: 'editor.section.extra', grid: 'extra' },
];

function gridValues(grid: NonNullable<(typeof SECTIONS)[number]['grid']>): readonly string[] {
  switch (grid) {
    case 'family': return Object.keys(FAMILIES);
    case 'shape': return (state.family ?? blobs).shapes;
    case 'eyes': return EYES;
    case 'mouth': return MOUTHS;
    case 'extra': return EXTRAS;
    case 'color': return Object.keys(COLORS);
  }
}

function buildPanel() {
  const body = $('#panel-body');
  body.replaceChildren();
  for (const section of SECTIONS) {
    const el = document.createElement('section');
    el.className = 'panel-section';
    const h = document.createElement('h3');
    h.textContent = t(section.title);
    el.append(h);
    if (section.grid) {
      const grid = document.createElement('div');
      grid.className = `tiles tiles-${section.grid}`;
      grid.dataset.grid = section.grid;
      grid.setAttribute('role', 'radiogroup');
      grid.setAttribute('aria-label', t(section.title));
      el.append(grid);
    }
    for (const spec of section.sliders ?? []) el.append(sliderRow(spec));
    body.append(el);
  }
}

function sliderRow(spec: SliderSpec): HTMLElement {
  const row = document.createElement('div');
  row.className = 'slider';
  row.dataset.axis = spec.id;
  const id = `s-${spec.id}`;
  row.innerHTML = `
    <label for="${id}">${t(`axis.${spec.id}` as Key)}</label>
    <output></output>
    <input id="${id}" type="range" min="0" max="${spec.max}" step="${spec.step}" class="${spec.id === 'hue' ? 'hue-range' : ''}">
    <button type="button" class="lock"></button>`;
  const input = row.querySelector('input')!;
  input.addEventListener('input', () => {
    setAxis(spec.id, Number(input.value));
    schedule();
  });
  row.querySelector('button')!.addEventListener('click', () => {
    if (isPinned(spec.id)) unpinAxis(spec.id);
    else setAxis(spec.id, Number(input.value));
    schedule();
  });
  return row;
}

function isPinned(id: SliderSpec['id']): boolean {
  return id === 'hue' || id === 'tone' || id === 'saturation' ? state[id] !== undefined : state.traits[id] !== undefined;
}

function setAxis(id: SliderSpec['id'], v: number) {
  if (id === 'hue' || id === 'tone' || id === 'saturation') state[id] = v;
  else state.traits[id] = v;
}

function unpinAxis(id: SliderSpec['id']) {
  if (id === 'hue' || id === 'tone' || id === 'saturation') delete state[id];
  else delete state.traits[id];
}

/** Valeur affichée d'un curseur : épinglée, sinon celle que donne le nom. */
function axisValue(id: SliderSpec['id'], r: ReturnType<typeof resolve>): number {
  const preset = state.color ? COLORS[state.color] : undefined;
  if (id === 'hue') return state.hue ?? r.hue;
  if (id === 'tone') return state.tone ?? preset?.tone ?? 0.5;
  if (id === 'saturation') return state.saturation ?? preset?.saturation ?? 0.74;
  return r.traits[id];
}

function selectTile(grid: string, value: string | undefined) {
  if (grid === 'family') {
    state.family = value ? FAMILIES[value as FamilyName] : undefined;
    // Une forme épinglée d'une autre famille n'a plus de sens.
    if (state.shape && !(state.family ?? blobs).shapes.includes(state.shape)) delete state.shape;
  } else if (grid === 'color') {
    state.color = value as ColorPreset | undefined;
    delete state.tone;
    delete state.saturation;
  } else {
    Object.assign(state, { [grid]: value });
  }
  if (value === undefined) Reflect.deleteProperty(state, grid);
}

function tile(grid: string, value: string | undefined, selected: boolean, visual: string, text: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'tile-btn';
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-checked', String(selected));
  b.innerHTML = `${decorative(visual)}<span></span>`;
  b.querySelector('span')!.textContent = text;
  b.addEventListener('click', () => {
    selectTile(grid, value);
    schedule(true);
  });
  return b;
}

/** Les vignettes coûtent cher (une trentaine de SVG) : on les recalcule moins souvent. */
function renderTiles() {
  const o = options();
  const r = resolve(o);
  const thumb = (patch: Partial<MochikaoOptions>) => mochikao({ ...o, ...patch, size: 46, animate: 'none', background: 'none', expression: 'idle' });

  for (const grid of document.querySelectorAll<HTMLElement>('[data-grid]')) {
    const kind = grid.dataset.grid!;
    const tiles: HTMLButtonElement[] = [];
    if (kind === 'color') {
      const dot = (c: string) => `<i class="swatch" style="background:${c}"></i>`;
      tiles.push(tile(kind, undefined, !state.color, dot(resolve({ ...o, color: undefined, tone: undefined, saturation: undefined }).colors.body), t('editor.auto')));
      for (const c of gridValues('color')) {
        tiles.push(tile(kind, c, state.color === c, dot(resolve({ ...o, color: c as ColorPreset, tone: undefined, saturation: undefined }).colors.body), label('color', c)));
      }
    } else if (kind === 'family') {
      for (const fam of gridValues('family')) {
        const family = FAMILIES[fam as FamilyName];
        const sample = family.shapes[Math.floor(r.traits.shape * family.shapes.length)]!;
        const selected = (state.family ?? blobs) === family;
        tiles.push(tile(kind, fam === 'blob' ? undefined : fam, selected, thumb({ family, shape: sample }), label('family', fam)));
      }
    } else {
      const key = kind as Discrete;
      const current = state[key];
      // Yeux et bouche sont minuscules à 46 px : on cadre sur le visage.
      const zoom = (svg: string) => (key === 'eyes' || key === 'mouth' ? svg.replace('viewBox="0 0 100 100"', 'viewBox="22 28 56 56"') : svg);
      tiles.push(tile(kind, undefined, current === undefined, zoom(thumb({ [key]: undefined })), `${t('editor.auto')} · ${label(key, r[key])}`));
      for (const v of gridValues(key as Discrete)) tiles.push(tile(kind, v, current === v, zoom(thumb({ [key]: v })), label(key, v)));
    }
    grid.replaceChildren(...tiles);
  }
}

// --- rendu ---

let frame = 0;
let tilesTimer = 0;

/** Rendu groupé à la frame suivante ; `tilesNow` pour un clic, sinon vignettes différées. */
function schedule(tilesNow = false) {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(render);
  clearTimeout(tilesTimer);
  tilesTimer = window.setTimeout(renderTiles, tilesNow ? 0 : 140);
}

function render() {
  const o = options();
  const r = resolve(o);
  save();

  morphTo($('#preview'), mochikao({ ...o, size: 280 }));
  document.documentElement.style.setProperty('--accent', r.colors.body);

  const others = OTHERS.filter((n) => n !== state.name.trim().toLowerCase()).slice(0, 8);
  $('#others').replaceChildren(
    ...others.map((n) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.title = n;
      b.innerHTML = mochikao({ ...o, name: n, size: 52, animate: 'none' });
      b.addEventListener('click', () => {
        state.name = n;
        $<HTMLInputElement>('#name').value = n;
        schedule(true);
      });
      return b;
    }),
  );

  for (const row of document.querySelectorAll<HTMLElement>('.slider')) {
    const id = row.dataset.axis as SliderSpec['id'];
    const v = axisValue(id, r);
    const input = row.querySelector('input')!;
    if (document.activeElement !== input) input.value = String(v);
    row.querySelector('output')!.textContent = id === 'hue' ? `${Math.round(v)}°` : v.toFixed(3);
    const pinned = isPinned(id);
    row.classList.toggle('pinned', pinned);
    const lock = row.querySelector('button')!;
    lock.innerHTML = pinned ? LOCK : UNLOCK;
    lock.setAttribute('aria-pressed', String(pinned));
    lock.setAttribute('aria-label', `${t(pinned ? 'editor.unpin' : 'editor.pin')} : ${t(`axis.${id}` as Key)}`);
  }

  for (const [id, key] of [['#expressions', 'expression'], ['#animate', 'animate'], ['#background', 'background']] as const) {
    const current = state[key] ?? (key === 'expression' ? 'idle' : 'none');
    for (const b of $(id).querySelectorAll('button')) b.setAttribute('aria-checked', String(b.value === current));
  }

  const n = pinCount();
  $('#pin-count').textContent = n === 0 ? t('editor.pinned.none') : n === 1 ? t('editor.pinned.one') : t('editor.pinned.many', { n });
  $('#unpin').hidden = n === 0;
  $('#note').textContent = n === 0 ? t('editor.note.none') : t('editor.note.some');
  $('#snippet').textContent = snippet(tab);
}

// --- code ---

type Tab = 'html' | 'react' | 'vue' | 'svelte' | 'solid' | 'js' | 'url';
const TABS: Tab[] = ['react', 'vue', 'svelte', 'solid', 'html', 'js', 'url'];
let tab: Tab = 'react';

function snippet(kind: Tab): string {
  const o = options();
  const params = [...toParams(o)];
  const name = state.name || 'alex';
  const numeric = new Set(['hue', 'tone', 'saturation']);
  // Une famille est un objet importé, pas une chaîne (sauf en HTML et dans l'URL).
  const fam = o.family && o.family !== blobs ? o.family.name : undefined;
  const famImport = fam ? `import { ${fam} } from 'mochikao/${fam}';\n` : '';
  const discrete = params.filter(([k]) => !(o.traits && k in o.traits) && k !== 'family');
  const traits = o.traits ? Object.entries(o.traits).map(([k, v]) => `${k}: ${+v!.toFixed(3)}`).join(', ') : '';
  const lines = (attrs: string[], open: string, close: string) =>
    attrs.length > 2
      ? `${open}\n${attrs.map((a) => `  ${a}`).join('\n')}\n${close}`
      : `${open} ${attrs.join(' ')}${close === '/>' ? ' ' : ''}${close}`;

  switch (kind) {
    case 'html': {
      const attrs = [`name="${name}"`, ...params.map(([k, v]) => `${k}="${v}"`)];
      const define = fam ? `${famImport}  defineMochikao({ families: [${fam}] });` : '  defineMochikao();';
      return `<script type="module">\n  import { defineMochikao } from 'mochikao/element';\n${define.replace(/^import/m, '  import')}\n</script>\n\n${lines(attrs, '<mochikao-avatar', '></mochikao-avatar>')}`;
    }
    case 'react':
    case 'solid':
    case 'svelte': {
      const attrs = [`name="${name}"`, ...(fam ? [`family={${fam}}`] : []), ...discrete.map(([k, v]) => (numeric.has(k) ? `${k}={${v}}` : `${k}="${v}"`))];
      if (traits) attrs.push(`traits={{ ${traits} }}`);
      const head = kind === 'svelte'
        ? `<script>\n  import Mochikao from 'mochikao/svelte';\n${famImport.replace(/^/gm, '  ').trimEnd()}\n</script>`.replace('\n\n</script>', '\n</script>')
        : `import { Mochikao } from 'mochikao/${kind}';\n${famImport}`.trimEnd();
      return `${head.replace(/\n\s*\n<\/script>/, '\n</script>')}\n\n${lines(attrs, '<Mochikao', '/>')}`;
    }
    case 'vue': {
      const attrs = [`name="${name}"`, ...(fam ? [`:family="${fam}"`] : []), ...discrete.map(([k, v]) => (numeric.has(k) ? `:${k}="${v}"` : `${k}="${v}"`))];
      if (traits) attrs.push(`:traits="{ ${traits} }"`);
      return `<script setup>\nimport { Mochikao } from 'mochikao/vue';\n${famImport}</script>\n\n<template>\n${lines(attrs, '<Mochikao', '/>').replace(/^/gm, '  ')}\n</template>`;
    }
    case 'js': {
      const fields = [`name: '${name}'`, ...(fam ? [`family: ${fam}`] : []), ...discrete.map(([k, v]) => `${k}: ${numeric.has(k) ? v : `'${v}'`}`)];
      if (traits) fields.push(`traits: { ${traits} }`);
      return `import { mochikao } from 'mochikao';\n${famImport}\nconst svg = mochikao({\n${fields.map((f) => `  ${f},`).join('\n')}\n});`;
    }
    case 'url': {
      const q = new URLSearchParams(params.filter(([k]) => k !== 'animate'));
      return `${location.origin}/api/${encodeURIComponent(name)}.svg${q.size ? `?${q}` : ''}`;
    }
  }
}

function buildTabs() {
  const tabs = $('#tabs');
  tabs.replaceChildren();
  for (const k of TABS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(k === tab));
    b.textContent = { html: 'HTML', react: 'React', vue: 'Vue', svelte: 'Svelte', solid: 'Solid', js: 'JS', url: 'URL' }[k];
    b.addEventListener('click', () => {
      tab = k;
      for (const o of tabs.querySelectorAll('[role=tab]')) o.setAttribute('aria-selected', String(o === b));
      schedule();
    });
    tabs.append(b);
  }
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'copy';
  copy.textContent = t('action.copy');
  copy.addEventListener('click', () => flash(copy, navigator.clipboard.writeText(snippet(tab)), 'action.copy'));
  tabs.append(copy);
}

async function flash(btn: HTMLButtonElement, p: Promise<unknown>, rest: Key) {
  try {
    await p;
    btn.textContent = t('action.copied');
  } catch {
    btn.textContent = t('action.failed');
  }
  setTimeout(() => (btn.textContent = t(rest)), 1400);
}

// --- contrôles de la colonne principale ---

function buildChoices() {
  const groups = [
    ['#expressions', 'expression', EXPRESSIONS, 'expr'],
    ['#animate', 'animate', ANIMATIONS, 'anim'],
    ['#background', 'background', BACKGROUNDS, 'bg'],
  ] as const;
  for (const [sel, key, values, group] of groups) {
    const box = $(sel);
    box.replaceChildren();
    for (const v of values) {
      const b = document.createElement('button');
      b.type = 'button';
      b.value = v;
      b.setAttribute('role', 'radio');
      b.textContent = label(group, v);
      b.addEventListener('click', () => {
        Object.assign(state, { [key]: v });
        schedule();
      });
      box.append(b);
    }
  }
}

function randomName(): string {
  const n = 2 + Math.floor(Math.random() * 2);
  return Array.from({ length: n }, () => SYLLABLES[Math.floor(Math.random() * SYLLABLES.length)]).join('');
}

function download(href: string, file: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = file;
  a.click();
}

const fileName = () => (state.name.trim() || 'mochikao').replace(/[^\p{L}\p{N}_-]+/gu, '-');

// --- démarrage ---

await initChrome();

const nameInput = $<HTMLInputElement>('#name');
nameInput.value = state.name;
nameInput.addEventListener('input', () => {
  state.name = nameInput.value;
  schedule();
});
$('#random').addEventListener('click', () => {
  state.name = nameInput.value = randomName();
  schedule(true);
});
$('#unpin').addEventListener('click', () => {
  for (const k of ['family', 'shape', 'eyes', 'mouth', 'extra', 'color', 'hue', 'tone', 'saturation'] as const) delete state[k];
  state.traits = {};
  schedule(true);
});
$('#dl-svg').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([mochikao({ ...options(), size: 512 })], { type: 'image/svg+xml' }));
  download(url, `${fileName()}.svg`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('#dl-png').addEventListener('click', async () => {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(mochikao({ ...options(), size: 512, animate: 'none' }))}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  canvas.getContext('2d')!.drawImage(img, 0, 0, 512, 512);
  download(canvas.toDataURL('image/png'), `${fileName()}.png`);
});
$<HTMLButtonElement>('#share').addEventListener('click', (e) => flash(e.currentTarget as HTMLButtonElement, navigator.clipboard.writeText(location.href), 'action.share'));
$<HTMLButtonElement>('#install').addEventListener('click', (e) => {
  const btn = e.currentTarget as HTMLButtonElement;
  void navigator.clipboard.writeText('npm i mochikao').then(() => {
    btn.classList.add('done');
    setTimeout(() => btn.classList.remove('done'), 1200);
  });
});

function buildAll() {
  buildPanel();
  buildChoices();
  buildTabs();
  schedule(true);
}

onLangChange(buildAll);
buildAll();
