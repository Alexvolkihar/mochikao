import { EXPRESSIONS, mochikao, resolve, type Expression } from '../src/index.ts';
import { FAMILIES, type FamilyName } from './shared/families.ts';
import { decorative, initChrome } from './shared/chrome.ts';
import { label, onLangChange } from './shared/i18n.ts';

const NAMES = [
  'alex', 'marie', 'zoé', 'kenji', 'lina', 'théo', 'nora', 'samir', 'ivy', 'oscar', 'jade', 'léo', 'mia', 'paul', 'rose',
  'yuki', 'amara', 'hugo', 'inès', 'tariq', 'clara', 'noé', 'elio', 'ada', 'linus', 'grace', 'margaret', 'dennis', 'ken',
  'barbara', 'tim', 'guido', 'brendan', 'rasmus', 'sophie', 'jules', 'lou', 'aya', 'malo', 'nina', 'émile', 'soline',
  'pixel', 'octocat', 'dependabot', 'ci-runner', 'prod-db', 'staging', 'le-chat', 'croissant', 'baguette', 'fromage',
  'team-core', 'design', 'support', 'admin@mochikao.dev', 'hello@exemple.fr', 'user_4821', 'n0va', 'zéphyr', 'tempête',
];

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const editorLink = (name: string, family?: FamilyName) =>
  `./editor.html?name=${encodeURIComponent(name)}${family && family !== 'blob' ? `&family=${family}` : ''}`;

await initChrome();

const nameInput = $<HTMLInputElement>('#name');
const hero = $('#hero');
let expression: Expression = 'idle';

function render() {
  const name = nameInput.value;
  const r = resolve({ name });
  hero.setAttribute('name', name);
  hero.setAttribute('expression', expression);
  $('#traits').textContent = `${label('shape', r.shape)} · ${label('eyes', r.eyes)} · ${label('mouth', r.mouth)}${r.extra === 'none' ? '' : ` · ${label('extra', r.extra)}`} · ${r.hue}°`;
  document.documentElement.style.setProperty('--accent', r.colors.body);
  $('#sizes').innerHTML = [96, 64, 44, 32, 24, 20].map((size) => mochikao({ name, size, expression })).join('');
  $<HTMLAnchorElement>('#cta').href = editorLink(name);
  for (const b of document.querySelectorAll<HTMLButtonElement>('#moods button')) b.setAttribute('aria-checked', String(b.value === expression));
  renderFamilies(name);
}

function renderFamilies(name: string) {
  $('#families').replaceChildren(
    ...(Object.keys(FAMILIES) as FamilyName[]).map((family) => {
      const a = document.createElement('a');
      a.className = 'family card';
      a.href = editorLink(name, family);
      const row = ['', '-1', '-2', '-3'].map((suffix) => decorative(mochikao({ name: `${name}${suffix}`, family: FAMILIES[family], size: 64, animate: 'hover' }))).join('');
      a.innerHTML = `<div class="family-row">${row}</div><span></span>`;
      a.querySelector('span')!.textContent = label('family', family);
      return a;
    }),
  );
}

function buildMoods() {
  $('#moods').replaceChildren(
    ...EXPRESSIONS.map((e) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.value = e;
      b.innerHTML = decorative(mochikao({ name: 'mood', shape: 'round', extra: 'none', expression: e, size: 22, hue: 0, tone: 0.92 }));
      b.append(label('expr', e));
      b.addEventListener('click', () => {
        expression = e;
        render();
      });
      return b;
    }),
  );
}

function shuffle() {
  const picks = [...NAMES].sort(() => Math.random() - 0.5).slice(0, 30);
  $('#gallery').replaceChildren(
    ...picks.map((n, i) => {
      // Un tiers d'animaux, un tiers de fruits & légumes, pour montrer les familles.
      const family = (['blob', 'animals', 'produce'] as const)[i % 3]!;
      const a = document.createElement('a');
      a.className = 'tile';
      a.href = editorLink(n, family);
      a.innerHTML = decorative(mochikao({ name: n, family: FAMILIES[family], size: 88, animate: 'hover' }));
      const span = document.createElement('span');
      span.textContent = n;
      a.append(span);
      return a;
    }),
  );
}

nameInput.addEventListener('input', render);
$('#shuffle').addEventListener('click', shuffle);
$('#cta-avatars').innerHTML = (['alex', 'marie', 'kenji'] as const)
  .map((n, i) => mochikao({ name: n, family: FAMILIES[(['blob', 'animals', 'produce'] as const)[i]!], size: 96, animate: 'always', expression: (['happy', 'love', 'idle'] as const)[i] }))
  .join('');

onLangChange(() => {
  buildMoods();
  render();
});
buildMoods();
shuffle();
render();
