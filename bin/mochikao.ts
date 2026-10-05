#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { mochikao, resolve } from '../src/index.ts';
import { animals } from '../src/families/animals.ts';
import { produce } from '../src/families/produce.ts';
import { parseParams } from '../src/params.ts';

const USAGE = `usage : mochikao <nom> [options]

  -o, --out <fichier>    écrit le SVG dans un fichier (sinon stdout)
  --size <px>            taille (défaut 128)
  --bg <fond>            none | circle | squircle | square
  --hue <0-360>          teinte
  --tone <0-1>           luminosité
  --expression <e>       idle | happy | sad | mad | love | shy | sick | thinking
  --animate <a>          none | hover | always
  --family <f>           blob | animals | produce
  --color <c>            pastel | pale | mid | deep | bright | ink
  --shape --eyes --mouth --extra   épingle un trait
  --info                 affiche les traits au lieu du SVG`;

const keys = ['size', 'bg', 'hue', 'tone', 'saturation', 'color', 'expression', 'animate', 'family', 'shape', 'eyes', 'mouth', 'extra'] as const;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', short: 'o' },
    info: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
    ...Object.fromEntries(keys.map((k) => [k, { type: 'string' as const }])),
  },
});

const name = positionals.join(' ');
if (values.help || !name) {
  console.log(USAGE);
  process.exit(values.help ? 0 : 1);
}

const options = parseParams(name, { get: (k) => values[k as keyof typeof values] as string | undefined }, [animals, produce]);

if (values.info) {
  const { traits, colors, family, ...rest } = resolve(options);
  console.log(JSON.stringify({ name, family: family.name, ...rest, colors }, null, 2));
} else if (values.out) {
  writeFileSync(values.out, mochikao(options));
  console.error(`✓ ${values.out}`);
} else {
  process.stdout.write(`${mochikao(options)}\n`);
}
