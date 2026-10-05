import { defineMochikao } from '../../src/element.ts';
import { EXTRA_FAMILIES } from './families.ts';
import { initI18n, langSelect, onLangChange, t } from './i18n.ts';
import { themeSwitcher } from './theme.ts';

/** Commun aux pages : web component, langue, thème. À attendre avant le premier rendu. */
export async function initChrome() {
  defineMochikao({ families: EXTRA_FAMILIES });
  await initI18n();
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
