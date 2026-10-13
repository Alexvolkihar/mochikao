import { defineMochikao } from '../../src/element.ts';
import { EXTRA_FAMILIES } from './families.ts';
import { initI18n, langSelect, onLangChange, t } from './i18n.ts';
import { themeSwitcher } from './theme.ts';

/** Commun aux pages : web component, langue, thème. À attendre avant le premier rendu. */
export async function initChrome() {
  defineMochikao({ families: EXTRA_FAMILIES });
  await initI18n();
  showCounts();
  const prefs = document.getElementById('prefs');
  if (!prefs) return;
  const mountTheme = () => themeSwitcher({ system: t('theme.system'), light: t('theme.light'), dark: t('theme.dark') });
  let theme = mountTheme();
  prefs.append(langSelect(), theme);
  onLangChange(() => {
    const next = mountTheme();
    theme.replaceWith(next);
    theme = next;
  });
}

/** SVG purement décoratif (son libellé est déjà ailleurs) : masqué aux lecteurs d'écran. */
export const decorative = (svg: string) => svg.replace('<svg ', '<svg aria-hidden="true" ');

const REPO = 'Alexvolkihar/mochikao';
const PACKAGE = 'mochikao';
const TTL = 60 * 60 * 1000;

/** Affiche un compteur dans la barre de navigation. Silencieux si l'API ne répond pas. */
async function showCount(ids: { box: string; out: string }, cacheKey: string, url: string, read: (json: unknown) => unknown) {
  const box = document.getElementById(ids.box);
  const out = document.getElementById(ids.out);
  if (!box || !out) return;
  const show = (n: number) => {
    out.textContent = new Intl.NumberFormat(document.documentElement.lang || undefined, { notation: 'compact' }).format(n);
    box.hidden = false;
  };
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey) ?? 'null') as { n: number; at: number } | null;
    if (cached && Date.now() - cached.at < TTL) return show(cached.n);
  } catch { /* stockage indisponible : on interroge l'API */ }
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) return;
    const n = read(await res.json());
    if (typeof n !== 'number' || !Number.isFinite(n)) return;
    show(n);
    try { sessionStorage.setItem(cacheKey, JSON.stringify({ n, at: Date.now() })); } catch { /* ignoré */ }
  } catch { /* hors ligne ou limite d'appels : le lien reste, sans le nombre */ }
}

/** Étoiles GitHub et téléchargements npm de la semaine, sans bloquer le premier rendu. */
function showCounts() {
  void showCount({ box: 'stars', out: 'stars-n' }, `mochikao:stars:${REPO}`, `https://api.github.com/repos/${REPO}`,
    (j) => (j as { stargazers_count?: unknown }).stargazers_count);
  void showCount({ box: 'downloads', out: 'downloads-n' }, `mochikao:downloads:${PACKAGE}`, `https://api.npmjs.org/downloads/point/last-week/${PACKAGE}`,
    (j) => (j as { downloads?: unknown }).downloads);
}
