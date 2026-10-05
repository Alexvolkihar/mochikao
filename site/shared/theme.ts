/**
 * Thème clair / sombre / système. La préférence est appliquée avant le premier
 * rendu par le petit script en ligne de chaque page (THEME_BOOT), puis ce module
 * gère le sélecteur et suit le système quand la préférence est « système ».
 */
export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'mochikao-theme';
const media = matchMedia('(prefers-color-scheme: dark)');

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function apply(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && media.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // Stockage indisponible (navigation privée...) : le thème vaut pour la page.
  }
  apply(pref);
}

media.addEventListener('change', () => {
  if (getThemePref() === 'system') apply('system');
});

const ICONS: Record<ThemePref, string> = {
  system: '<path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm0 1.5v9a4.5 4.5 0 0 1 0-9z" fill="currentColor"/>',
  light: '<circle cx="8" cy="8" r="3" fill="currentColor"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  dark: '<path d="M13.5 10A6 6 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5z" fill="currentColor"/>',
};

/** Sélecteur à trois boutons. `labels` fournit les textes accessibles (traduits). */
export function themeSwitcher(labels: Record<ThemePref, string>): HTMLElement {
  const group = document.createElement('div');
  group.className = 'theme-switch';
  group.setAttribute('role', 'radiogroup');
  const sync = () => {
    for (const b of group.querySelectorAll('button')) b.setAttribute('aria-checked', String(b.value === getThemePref()));
  };
  for (const pref of ['system', 'light', 'dark'] as const) {
    const b = document.createElement('button');
    b.type = 'button';
    b.value = pref;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', labels[pref]);
    b.title = labels[pref];
    b.innerHTML = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">${ICONS[pref]}</svg>`;
    b.addEventListener('click', () => {
      setThemePref(pref);
      sync();
    });
    group.append(b);
  }
  sync();
  return group;
}
