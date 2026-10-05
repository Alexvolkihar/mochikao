/**
 * Traductions du site. Le français fait référence : une clé absente d'une
 * autre langue retombe sur lui. Dans le HTML, data-i18n="clé" remplace le
 * texte, data-i18n-html le HTML (dictionnaires internes uniquement), et
 * data-i18n-aria / data-i18n-placeholder / data-i18n-title les attributs.
 */
import { fr } from './locales/fr.ts';

export type Dict = typeof fr;
export type Key = keyof Dict;
export type Lang = 'fr' | 'en' | 'es' | 'ja';

export const LANGS: Record<Lang, { label: string; load: () => Promise<Partial<Dict>> }> = {
  fr: { label: 'Français', load: async () => fr },
  en: { label: 'English', load: async () => (await import('./locales/en.ts')).en },
  es: { label: 'Español', load: async () => (await import('./locales/es.ts')).es },
  ja: { label: '日本語', load: async () => (await import('./locales/ja.ts')).ja },
};

const KEY = 'mochikao-lang';
let lang: Lang = 'fr';
let dict: Partial<Dict> = fr;
const listeners = new Set<() => void>();

const isLang = (v: unknown): v is Lang => typeof v === 'string' && Object.hasOwn(LANGS, v);

/** ?lang=, puis le choix enregistré, puis la langue du navigateur, puis le français. */
function detect(): Lang {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (isLang(fromUrl)) return fromUrl;
  try {
    const saved = localStorage.getItem(KEY);
    if (isLang(saved)) return saved;
  } catch {
    // stockage indisponible
  }
  for (const l of navigator.languages ?? [navigator.language]) {
    const short = l.slice(0, 2).toLowerCase();
    if (isLang(short)) return short;
  }
  return 'fr';
}

export function getLang(): Lang {
  return lang;
}

export function t(key: Key, vars?: Record<string, string | number>): string {
  let s: string = dict[key] ?? fr[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** Libellé d'une valeur de trait (forme, yeux, expression...), ou la valeur brute. */
export function label(group: string, value: string): string {
  const key = `${group}.${value}` as Key;
  return key in fr ? t(key) : value;
}

export function applyI18n(root: ParentNode = document) {
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n]')) el.textContent = t(el.dataset.i18n as Key);
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml as Key);
  for (const [attr, data] of [['aria-label', 'i18nAria'], ['placeholder', 'i18nPlaceholder'], ['title', 'i18nTitle']] as const) {
    for (const el of root.querySelectorAll<HTMLElement>(`[data-${data.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}]`)) {
      el.setAttribute(attr, t(el.dataset[data] as Key));
    }
  }
  document.documentElement.lang = lang;
  const title = document.querySelector<HTMLElement>('[data-i18n-doc-title]');
  if (title) document.title = t(title.dataset.i18nDocTitle as Key);
}

export async function setLang(next: Lang) {
  dict = await LANGS[next].load();
  lang = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // stockage indisponible : la langue vaut pour la page
  }
  applyI18n();
  for (const fn of listeners) fn();
}

export function onLangChange(fn: () => void) {
  listeners.add(fn);
}

export async function initI18n() {
  const l = detect();
  if (l !== 'fr') dict = await LANGS[l].load();
  lang = l;
  applyI18n();
}

export function langSelect(): HTMLElement {
  const select = document.createElement('select');
  select.className = 'lang-select';
  select.setAttribute('aria-label', t('prefs.language'));
  for (const [code, { label: name }] of Object.entries(LANGS)) select.add(new Option(name, code));
  select.value = lang;
  select.addEventListener('change', () => {
    if (isLang(select.value)) void setLang(select.value);
  });
  onLangChange(() => select.setAttribute('aria-label', t('prefs.language')));
  return select;
}
