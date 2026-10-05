import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { animals, ANIMALS } from '../src/families/animals.ts';
import { produce, PRODUCE } from '../src/families/produce.ts';
import { EXPRESSIONS, EXTRAS, SHAPES, mochikao, isFamily, resolve, type ShapeFamily } from '../src/index.ts';
import { parseParams, toParams } from '../src/params.ts';

describe('familles', () => {
  it('chaque forme se rend avec chaque expression et chaque accessoire', () => {
    for (const family of [animals, produce]) {
      for (const shape of family.shapes) {
        for (const expression of EXPRESSIONS) {
          for (const extra of EXTRAS) {
            const svg = mochikao({ name: 'x', family, shape, expression, extra, background: 'circle' });
            assert.ok(!svg.includes('NaN') && !svg.includes('undefined'), `${shape} ${expression} ${extra}`);
          }
        }
      }
    }
  });

  it('le nom choisit dans la famille demandée, et les blobs restent le défaut', () => {
    const seen = (family?: ShapeFamily) => new Set(Array.from({ length: 300 }, (_, i) => resolve({ name: `n${i}`, family }).shape));
    assert.deepEqual([...seen(animals)].sort(), [...ANIMALS].sort());
    assert.deepEqual([...seen(produce)].sort(), [...PRODUCE].sort());
    assert.deepEqual([...seen()].sort(), [...SHAPES].sort());
  });

  it("choisir une famille ne change ni les yeux, ni la bouche, ni l'accessoire", () => {
    const a = resolve('alex');
    const b = resolve({ name: 'alex', family: animals });
    assert.deepEqual([b.eyes, b.mouth, b.extra], [a.eyes, a.mouth, a.extra]);
  });

  it('une forme hors de la famille est ignorée', () => {
    assert.equal(resolve({ name: 'alex', family: animals, shape: 'cat' }).shape, 'cat');
    assert.equal(resolve({ name: 'alex', shape: 'cat' }).shape, resolve('alex').shape);
  });

  it('les fruits & légumes gardent leur teinte naturelle (±12°)', () => {
    for (let i = 0; i < 50; i++) {
      const r = resolve({ name: `p${i}`, family: produce, shape: 'lemon' });
      assert.ok(Math.abs(r.hue - 50) <= 12, `${r.hue}`);
    }
    assert.equal(resolve({ name: 'p', family: produce, hue: 200 }).hue, 200);
  });

  it('une famille invalide retombe sur les blobs', () => {
    assert.equal(isFamily({ name: 'x' }), false);
    assert.equal(mochikao({ name: 'a', family: { name: 'x' } as never }), mochikao({ name: 'a' }));
  });

  it('par leur nom dans les paramètres, seulement si on les fournit', () => {
    const q = new URLSearchParams('family=animals&shape=frog');
    assert.equal(parseParams('a', q).family, undefined);
    assert.equal(parseParams('a', q).shape, undefined);
    const o = parseParams('a', q, [animals, produce]);
    assert.equal(o.family, animals);
    assert.equal(o.shape, 'frog');
    assert.equal(toParams(o).toString(), 'family=animals&shape=frog');
  });
});
