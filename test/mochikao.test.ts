import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COLORS, EXPRESSIONS, SHAPES, mochikao, contrast, deriveTraits, hslToRgb, palette, resolve,
} from '../src/index.ts';
import { parseParams, toParams } from '../src/params.ts';

const hexToRgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];

describe('déterminisme', () => {
  it('même nom, même SVG', () => {
    assert.equal(mochikao('alex'), mochikao('alex'));
    assert.equal(mochikao({ name: 'alex', expression: 'happy' }), mochikao({ name: 'alex', expression: 'happy' }));
  });

  it('insensible à la casse et aux espaces autour', () => {
    assert.equal(mochikao({ name: 'Alex@Mail.com ', title: 't' }), mochikao({ name: 'alex@mail.com', title: 't' }));
  });

  it('des noms différents donnent des avatars différents', () => {
    const svgs = new Set(Array.from({ length: 200 }, (_, i) => mochikao(`user-${i}`)));
    assert.equal(svgs.size, 200);
  });

  it('les traits se répartissent sur toutes les formes', () => {
    const seen = new Set(Array.from({ length: 500 }, (_, i) => resolve(`n${i}`).shape));
    assert.deepEqual([...seen].sort(), [...SHAPES].sort());
  });

  // Garde-fou de stabilité : si ce test casse, toutes les URLs publiées changent d'image.
  it('les traits de "alex" ne bougent pas', () => {
    const r = resolve('alex');
    assert.deepEqual(
      { shape: r.shape, eyes: r.eyes, mouth: r.mouth, extra: r.extra, hue: r.hue },
      { shape: 'boxy', eyes: 'dot', mouth: 'cat', extra: 'blush', hue: 348 },
    );
  });
});

describe('épinglage', () => {
  it('épingler un axe ne change pas les autres', () => {
    const free = deriveTraits('marie');
    const pinned = deriveTraits('marie', { shape: 0.01 });
    assert.equal(pinned.shape, 0.01);
    assert.equal(pinned.hue, free.hue);
    assert.equal(pinned.eyes, free.eyes);
  });

  it('épingler par nom', () => {
    for (const shape of SHAPES) assert.equal(resolve({ name: 'x', shape }).shape, shape);
  });
});

describe('couleurs', () => {
  it('contraste encre/corps >= 4.5 pour toute teinte et tout ton', () => {
    for (let h = 0; h < 360; h += 7) {
      for (const tone of [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1]) {
        const p = palette(h, tone);
        const c = contrast(hexToRgb(p.body), hexToRgb(p.ink));
        assert.ok(c >= 4.5, `teinte ${h}, ton ${tone} : ${c.toFixed(2)}`);
      }
    }
  });

  it('contraste >= 4.5 aussi pour chaque préréglage de couleur', () => {
    for (const [name, { tone, saturation }] of Object.entries(COLORS)) {
      for (let h = 0; h < 360; h += 5) {
        const p = palette(h, tone, saturation);
        const c = contrast(hexToRgb(p.body), hexToRgb(p.ink));
        assert.ok(c >= 4.5, `${name}, teinte ${h} : ${c.toFixed(2)}`);
      }
    }
  });

  it('hslToRgb sur les primaires', () => {
    assert.deepEqual(hslToRgb(0, 100, 50), [1, 0, 0]);
    assert.deepEqual(hslToRgb(120, 100, 50), [0, 1, 0]);
  });
});

describe('rendu', () => {
  it('chaque expression et chaque fond produit un SVG', () => {
    for (const expression of EXPRESSIONS) {
      for (const background of ['none', 'circle', 'squircle', 'square'] as const) {
        const svg = mochikao({ name: 'test', expression, background, animate: 'always', gaze: true });
        assert.match(svg, /^<svg [^>]*viewBox="0 0 100 100"/);
        assert.ok(svg.endsWith('</svg>'));
        assert.ok(!svg.includes('NaN') && !svg.includes('undefined'), `${expression}/${background}`);
      }
    }
  });

  it('échappe le nom', () => {
    const svg = mochikao('<script>"x"&</script>');
    assert.ok(!svg.includes('<script>'));
    assert.ok(svg.includes('&lt;script&gt;&quot;x&quot;&amp;'));
  });

  it("pas de CSS quand rien n'est animé", () => {
    assert.ok(!mochikao('alex').includes('<style>'));
    assert.ok(mochikao({ name: 'alex', animate: 'hover' }).includes('animation-play-state:paused'));
  });

  it('identité du personnage : stable entre expressions, distincte entre noms', () => {
    const id = (o: Parameters<typeof mochikao>[0]) => /data-mochikao="([^"]+)"/.exec(mochikao(o))![1];
    assert.equal(id({ name: 'alex' }), id({ name: 'alex', expression: 'love', animate: 'always' }));
    assert.notEqual(id({ name: 'alex' }), id({ name: 'marie' }));
    assert.notEqual(id({ name: 'alex' }), id({ name: 'alex', size: 64 }));
    assert.match(mochikao({ name: 'alex', expression: 'sad' }), /data-expression="sad"/);
  });

  it('respecte la taille', () => {
    assert.match(mochikao({ name: 'a', size: 48 }), /width="48" height="48"/);
  });
});

describe('axes continus', () => {
  it('chaque axe épinglé change le rendu, sans toucher aux traits discrets', () => {
    const base = resolve('alex');
    for (const axis of ['bodySize', 'proportion', 'squareness', 'eyeSize', 'lean', 'gazeX', 'gazeY', 'mouthSize', 'spacing'] as const) {
      const lo = mochikao({ name: 'alex', traits: { [axis]: 0 } });
      const hi = mochikao({ name: 'alex', traits: { [axis]: 1 } });
      assert.notEqual(lo, hi, axis);
      const r = resolve({ name: 'alex', traits: { [axis]: 1 } });
      assert.equal(r.shape, base.shape);
      assert.equal(r.hue, base.hue);
    }
  });

  it('le corps reste dans le cadre aux extrêmes', () => {
    for (const shape of SHAPES) {
      for (const v of [0, 1]) {
        const svg = mochikao({ name: 'x', shape, traits: { bodySize: 1, proportion: v, squareness: v } });
        const nums = [.../<path d="(M[^"]+)"/.exec(svg)![1]!.matchAll(/-?\d+(\.\d+)?/g)].map((m) => Number(m[0]));
        assert.ok(Math.min(...nums) >= 0 && Math.max(...nums) <= 100, `${shape} ${v}`);
      }
    }
  });

  it('préréglage de couleur, et tone/saturation explicites prioritaires', () => {
    assert.notEqual(mochikao({ name: 'a', color: 'pastel' }), mochikao({ name: 'a' }));
    assert.equal(mochikao({ name: 'a', color: 'pastel', tone: 0.5, saturation: 0.74 }), mochikao({ name: 'a' }));
  });
});

describe('parseParams', () => {
  it('toParams en est l\'inverse', () => {
    const o = { name: 'a', size: 64, background: 'circle', color: 'pastel', hue: 120, expression: 'love', shape: 'cloud', traits: { lean: 0.25, gazeX: 1 } } as const;
    assert.equal(toParams(o).toString(), 'size=64&background=circle&hue=120&color=pastel&expression=love&shape=cloud&lean=0.25&gazeX=1');
    assert.deepEqual(parseParams('a', toParams(o)), o);
    assert.equal(toParams({ name: 'a', expression: 'idle', animate: 'none' }).toString(), '');
  });

  it('lit les axes continus et le préréglage de couleur', () => {
    const q = new URLSearchParams('bodySize=0.3&lean=2&color=deep&saturation=0.5');
    assert.deepEqual(parseParams('a', q), { name: 'a', saturation: 0.5, color: 'deep', traits: { bodySize: 0.3, lean: 1 } });
  });

  it('lit et borne les valeurs', () => {
    const q = new URLSearchParams('size=99999&bg=circle&hue=400&tone=0.2&expression=love&shape=nope');
    assert.deepEqual(parseParams('a', q), { name: 'a', size: 1024, background: 'circle', hue: 360, tone: 0.2, expression: 'love' });
  });
});
