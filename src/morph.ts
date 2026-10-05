/**
 * Transition animée entre deux expressions d'un même personnage.
 *
 * Plutôt que d'interpoler des formes incompatibles (cœurs, arcs, cercles...),
 * on fait comme un dessin animé : les yeux clignent, la bouche se referme,
 * on change de visage pendant qu'ils sont fermés, puis tout se rouvre avec
 * un léger rebond et le corps s'écrase un instant.
 */

const OUT = 150;
const IN = 300;
const SPRING = 'cubic-bezier(.34,1.56,.64,1)';

interface Running {
  target: string;
  animations: Animation[];
}

const running = new WeakMap<Element, Running>();

const attr = (svg: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(svg)?.[1];

function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Les parties animées, avec l'origine de transformation qui leur convient. */
function parts(svg: SVGSVGElement) {
  const centered = (el: Element | null) => {
    if (el instanceof SVGElement) {
      el.style.transformBox = 'fill-box';
      el.style.transformOrigin = 'center';
    }
    return el;
  };
  const squash = svg.querySelector<SVGElement>('.sq');
  if (squash) squash.style.transformOrigin = '50px 92px';
  return {
    eyes: centered(svg.querySelector('.bl')),
    mouth: centered(svg.querySelector('.mo')),
    squash,
    fades: [...svg.querySelectorAll('.br, .fr, .fx')],
  };
}

function play(svg: SVGSVGElement, direction: 'out' | 'in'): Animation[] {
  const p = parts(svg);
  const out = direction === 'out';
  const timing: KeyframeAnimationOptions = out
    ? { duration: OUT, easing: 'ease-in', fill: 'forwards' }
    : { duration: IN, easing: SPRING, fill: 'backwards' };
  const span = <T>(open: T, closed: T) => (out ? [open, closed] : [closed, open]);

  const list: Animation[] = [];
  const run = (el: Element | null, frames: Keyframe[], extra?: KeyframeAnimationOptions) => {
    if (el) list.push(el.animate(frames, { ...timing, ...extra }));
  };
  run(p.eyes, span({ transform: 'scaleY(1)' }, { transform: 'scaleY(.08)' }));
  run(p.mouth, span({ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.4,.1)', opacity: 0 }));
  run(p.squash, span({ transform: 'scale(1,1)' }, { transform: 'scale(1.04,.96)' }));
  for (const el of p.fades) run(el, span({ opacity: 1 }, { opacity: 0 }), out ? undefined : { easing: 'ease-out' });
  return list;
}

/**
 * Remplace le SVG contenu dans `host` par `next`. Si c'est le même personnage
 * avec une autre expression, la transition est animée ; sinon (autre nom,
 * autre taille, mouvement réduit, pas de Web Animations), remplacement direct.
 * Un appel pendant une transition en cours la termine et repart de là.
 */
export function morphTo(host: Element, next: string): void {
  const current = running.get(host);
  if (current) {
    if (current.target === next) return;
    // Annuler rouvre le visage affiché (ancien ou nouveau selon la phase),
    // et on repart de lui vers la nouvelle cible, sans étape intermédiaire.
    for (const a of current.animations) a.cancel();
    running.delete(host);
  }

  const svg = host.firstElementChild;
  const canMorph =
    svg instanceof SVGSVGElement &&
    typeof svg.animate === 'function' &&
    !reducedMotion() &&
    svg.getAttribute('data-mochikao') === attr(next, 'data-mochikao') &&
    svg.getAttribute('data-expression') !== attr(next, 'data-expression');

  if (!canMorph) {
    host.innerHTML = next;
    return;
  }

  const state: Running = { target: next, animations: play(svg, 'out') };
  running.set(host, state);
  Promise.all(state.animations.map((a) => a.finished)).then(
    () => {
      if (running.get(host) !== state) return;
      host.innerHTML = next;
      const fresh = host.firstElementChild;
      state.animations = fresh instanceof SVGSVGElement ? play(fresh, 'in') : [];
      Promise.all(state.animations.map((a) => a.finished)).then(
        () => {
          if (running.get(host) !== state) return;
          for (const a of state.animations) a.cancel();
          running.delete(host);
        },
        () => {},
      );
    },
    () => {}, // annulée par un appel plus récent
  );
}
