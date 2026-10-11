import { defineMochikao } from '../../src/element.ts';
import { EXTRA_FAMILIES } from './families.ts';
import { initI18n, langSelect, onLangChange, t } from './i18n.ts';
import { themeSwitcher } from './theme.ts';

/** Commun aux pages : web component, langue, thème. À attendre avant le premier rendu. */
export async function initChrome() {
  defineMochikao({ families: EXTRA_FAMILIES });
  await initI18n();
  void showStars(); // sans attendre : le réseau ne bloque pas le premier rendu
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
const STARS_TTL = 60 * 60 * 1000;

/** Nombre d'étoiles GitHub dans la barre de navigation. Silencieux si l'API ne répond pas. */
async function showStars() {
  const box = document.getElementById('stars');
  const out = document.getElementById('stars-n');
  if (!box || !out) return;
  const show = (n: number) => {
    out.textContent = new Intl.NumberFormat(document.documentElement.lang || undefined, { notation: 'compact' }).format(n);
    box.hidden = false;
  };
  const key = `mochikao:stars:${REPO}`;
  try {
    const cached = JSON.parse(sessionStorage.getItem(key) ?? 'null') as { n: number; at: number } | null;
    if (cached && Date.now() - cached.at < STARS_TTL) return show(cached.n);
  } catch { /* stockage indisponible : on interroge l'API */ }
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, { headers: { accept: 'application/vnd.github+json' } });
    if (!res.ok) return;
    const n = (await res.json() as { stargazers_count?: unknown }).stargazers_count;
    if (typeof n !== 'number') return;
    show(n);
    try { sessionStorage.setItem(key, JSON.stringify({ n, at: Date.now() })); } catch { /* ignoré */ }
  } catch { /* hors ligne ou limite d'appels : le lien reste, sans le nombre */ }
}
