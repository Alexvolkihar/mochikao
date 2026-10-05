import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createComponent } from 'solid-js';
import { renderToString as renderSolid } from 'solid-js/web';
import { compile } from 'svelte/compiler';
import { render as renderSvelte } from 'svelte/server';
import { createSSRApp, h } from 'vue';
import { renderToString as renderVue } from 'vue/server-renderer';
import { animals } from '../src/families/animals.ts';
import { mochikao, mochikaoDataUri } from '../src/index.ts';
import { Mochikao as ReactMochikao } from '../src/react.ts';
import { Mochikao as SolidMochikao } from '../src/solid.ts';
import { Mochikao as VueMochikao } from '../src/vue.ts';

// Compile le .svelte en module serveur, à l'intérieur du projet pour que
// l'import `mochikao` se résolve sur le package lui-même.
const svelteSource = fileURLToPath(new URL('../src/svelte/Mochikao.svelte', import.meta.url));
const svelteOut = new URL('./.out/Mochikao.svelte.js', import.meta.url);
mkdirSync(new URL('.', svelteOut), { recursive: true });
writeFileSync(svelteOut, compile(readFileSync(svelteSource, 'utf8'), { generate: 'server', filename: svelteSource }).js.code);
const { default: SvelteMochikao } = await import(svelteOut.href);

type Props = Record<string, unknown> & { name: string };

const renderers: Record<string, (p: Props) => Promise<string> | string> = {
  react: (p) => renderToStaticMarkup(createElement(ReactMochikao, p as never)),
  vue: (p) => renderVue(createSSRApp({ render: () => h(VueMochikao, p as never) })),
  svelte: (p) => renderSvelte(SvelteMochikao, { props: p }).body,
  solid: (p) => renderSolid(() => createComponent(SolidMochikao, p as never)),
};

const decode = (s: string) =>
  s.replace(/&(#x27|#39|amp|quot|lt|gt);/g, (_, e: string) => ({ '#x27': "'", '#39': "'", amp: '&', quot: '"', lt: '<', gt: '>' })[e]!);
const attr = (html: string, name: string) => {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(html);
  return m ? decode(m[1]!) : undefined;
};
// Chaque framework sérialise le style à sa façon : on compare sans espaces ni ; final.
const css = (html: string) => attr(html, 'style')?.replace(/\s/g, '').replace(/;$/, '');

const props = { name: "zoé & l'<ami>", size: 48, expression: 'happy', background: 'circle' } as const;

for (const [framework, render] of Object.entries(renderers)) {
  describe(`composant ${framework}`, () => {
    it('sans animation : un <img> équivalent à mochikao()', async () => {
      const html = await render(props);
      assert.match(html, /<img\s/);
      assert.ok(!html.includes('<svg'));
      const src = /\ssrc="([^"]*)"/.exec(html)![1]!;
      assert.equal(src, mochikaoDataUri(props), "la data URI n'a pas besoin d'être échappée dans le HTML");
      assert.equal(attr(html, 'alt'), props.name);
      assert.equal(attr(html, 'width'), '48');
      assert.equal(attr(html, 'height'), '48');
    });

    it('transmet toutes les options de mochikao() (couleur, saturation, famille...)', async () => {
      const full = { name: 'alex', size: 40, color: 'pastel', saturation: 0.3, tone: 0.7, family: animals, shape: 'frog', eyes: 'wide', mouth: 'grin', extra: 'crown', expression: 'love', background: 'squircle', hue: 120, traits: { lean: 0.9 }, title: 't' } as const;
      const html = await render(full);
      assert.equal(/\ssrc="([^"]*)"/.exec(html)![1], mochikaoDataUri(full));
      assert.ok(!/\s(color|saturation|family|traits)=/.test(html.replace(/src="[^"]*"/, '')), 'aucune option ne fuit en attribut HTML');
    });

    it('animé : le SVG en ligne', async () => {
      const html = await render({ ...props, animate: 'hover' });
      assert.match(html, /^(<!--[^>]*-->)*<span\s/);
      assert.ok(html.includes(mochikao({ ...props, animate: 'hover' })));
    });

    it('inline : le SVG en ligne même sans animation', async () => {
      const html = await render({ ...props, inline: true });
      assert.ok(html.includes(mochikao(props)));
    });

    it("transmet class et fusionne le style, sur l'img comme sur le span", async () => {
      const style = framework === 'react' ? { margin: 2 } : framework === 'solid' ? { margin: '2px' } : 'margin:2px';
      const cls = framework === 'react' ? { className: 'x' } : { class: 'x' };
      for (const extra of [{}, { animate: 'always' }]) {
        const html = await render({ name: 'a', ...cls, style, ...extra });
        assert.equal(attr(html, 'class')?.trim(), 'x');
        assert.equal(css(html), 'display:inline-block;vertical-align:middle;line-height:0;margin:2px');
      }
    });
  });
}

describe('mochikaoDataUri', () => {
  it('se décode exactement en mochikao(), même avec accents, emoji et caractères spéciaux', () => {
    for (const name of ['alex', 'zoé', `a&b<c>"d'e#%{}`, '😀 emoji']) {
      const uri = mochikaoDataUri(name);
      assert.ok(uri.startsWith('data:image/svg+xml,'));
      assert.match(uri, /^[\x21-\x7E ]+$/, 'ASCII imprimable uniquement');
      assert.ok(!/["'&<>#]/.test(uri), 'rien à échapper dans un attribut HTML');
      assert.equal(decodeURIComponent(uri.slice('data:image/svg+xml,'.length)), mochikao(name));
    }
  });
});

describe('options invalides venant de JS non typé', () => {
  it('retombe sur les valeurs par défaut sans produire undefined ni NaN', () => {
    const svg = mochikao({ name: 'a', expression: 'nope', background: 'x', animate: 'y', size: 'z', hue: 'w', tone: {}, traits: { shape: 'q' } } as never);
    assert.ok(!svg.includes('undefined') && !svg.includes('NaN'));
    assert.equal(svg, mochikao({ name: 'a' }));
  });
});
