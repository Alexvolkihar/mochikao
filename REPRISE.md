# Reprise — mochikao

Notes pour reprendre le projet plus tard. État au 8 octobre 2026.

## En une phrase

**mochikao** génère des avatars SVG déterministes : un nom (pseudo, e-mail, id) donne toujours le même petit personnage. Inspiré de [blobatar](https://blobatar.dev). Le projet s'est appelé `bulle`, puis `bouille`, avant `mochikao`.

## Démarrer

```bash
npm install
npm run dev          # site sur http://localhost:5173 (accueil + /editor.html), API /api/<nom>.svg branchée
npm test             # 50 tests node:test (lib + composants rendus côté serveur)
npm run typecheck
npm run build        # lib + CLI dans dist/
npm run build:site   # site statique dans dist-site/
npm run api          # API seule sur :8787
node bin/mochikao.ts alex --info
```

Node ≥ 22.18 pour développer (les `.ts` s'exécutent directement). Le paquet publié, lui, tourne sur Node ≥ 20.

## Ce qui existe

- **Lib** (`src/`), zéro dépendance, ~7 Ko min+gzip :
  - `mochikao(options)` renvoie une chaîne SVG ; `resolve()` donne les traits sans dessiner.
  - 10 formes de blobs, 5 yeux, 6 bouches, 11 accessoires, 8 expressions, 4 fonds.
  - 10 axes continus réglables (taille, proportion, carrure, yeux, regard, bouche…), 6 préréglages de couleur.
  - Contraste visage/corps ≥ 4.5:1 garanti, vérifié par les tests.
  - Animations CSS (respiration, clignement, coups d'œil) et suivi du regard (`gaze`).
- **Familles optionnelles**, en modules séparés : `mochikao/animals` (+1,1 Ko), `mochikao/produce` (+1,5 Ko). Contrat `ShapeFamily` dans `src/family.ts`.
- **Transition entre expressions** : `mochikao/morph` (`morphTo`), Web Animations API. Ne joue qu'en SVG en ligne, pas en `<img>`.
- **Intégrations** : composants React / Vue / Svelte / Solid, web component `<mochikao-avatar>`, API HTTP (`api/`), CLI (`bin/`).
  - Sans animation, les composants rendent un `<img>` (1 nœud DOM au lieu d'une vingtaine).
  - `inline` force le SVG en ligne.
- **Site** (`site/`) :
  - Accueil et éditeur avancé, avec grilles, curseurs à épingler, code pour 7 cibles et URL partageable.
  - Thème clair / sombre / système ; langues fr, en, es, ja.

## Décisions à ne pas défaire sans y penser

- **Stabilité des avatars.** La graine dépend du préfixe `bulle:g${GENERATION}` (`src/traits.ts`), de l'ordre des axes tirés et de l'ordre des listes. Changer l'un d'eux change des avatars.
  - Le préfixe garde l'ancien nom « bulle » exprès.
  - Le test « les traits de "alex" ne bougent pas » sert de garde-fou.
  - Avant publication, des changements visibles restent acceptables. Après, il faudra incrémenter `GENERATION`.
- **Familles = objets importés**, pas des chaînes ni une inscription par effet de bord, pour que le cœur reste petit et compatible avec le tree-shaking (`sideEffects: false`). Là où les options arrivent en texte (HTML, URL, CLI), on déclare les familles : `defineMochikao({ families })`, `parseParams(nom, params, families)`.
- **Un seul paquet npm** avec des sous-chemins, plutôt qu'un paquet par framework : plus simple à maintenir. Les frameworks sont des `peerDependencies` optionnelles.
- **ESM uniquement.**
- **`<img>` par défaut** dans les composants. Conséquence : pas d'animation ni de transition sans `animate` ou `inline`.

## Reste à faire

### Avant de publier
- [ ] Créer le dépôt GitHub et pousser `main`, puis ajouter `repository`, `homepage` et `bugs` dans `package.json`.
- [ ] Sur GitHub : alertes Dependabot, détection de secrets avec blocage au push, signalement privé de vulnérabilités, protection de `main` (pas de force-push, CI obligatoire), environnement `npm`.
- [ ] README en anglais : la page npm l'affiche, et il est en français.
- [ ] Première publication à la main (`npm login` puis `npm publish`), puis activer le Trusted Publishing sur npmjs.com : les versions suivantes partent par `release.yml` (voir README, « Publier »).

### Déjà en place
- CI GitHub Actions (`ci.yml`) : types, tests, builds sur Node 22 et 24, audit des dépendances publiées, publint. Actions figées par SHA, permissions en lecture seule.
- Publication par tag (`release.yml`) en Trusted Publishing, Dependabot, `SECURITY.md`, `.gitignore` qui exclut `.env` et `.npmrc`.

### Idées et limites connues
- [ ] **Suivi du regard à grande échelle** : chaque `<mochikao-avatar gaze>` a son propre écouteur et provoque un recalcul de mise en page par frame. Ça va pour une trentaine d'avatars, pas pour des centaines. Piste : un écouteur partagé, les positions en cache, `IntersectionObserver`.
- [ ] **Page de test visuelle** de toutes les combinaisons (formes × yeux × bouches × accessoires × extrêmes des curseurs). Jusqu'ici, seuls des échantillons ont été vérifiés à l'œil.
- [ ] **Tests navigateur automatisés.** La transition, la réactivité Solid, les langues et le thème ont été vérifiés dans Chrome via un script DevTools jetable, qui n'est pas dans le dépôt. À transformer en `npm run test:browser`.
- [ ] **Relire les traductions** en, es, ja (écrites sans relecture par un locuteur natif, surtout le japonais).
- [ ] **Petits défauts visuels** :
  - les yeux en cœur (`love`) se voient peu sur un corps rouge ;
  - aux extrêmes des curseurs, certaines formes perdent leur identité (une carotte à carrure maximale devient une boîte) ;
  - sur l'avocat, une grande bouche frôle le noyau.
- [ ] **Encore absent par rapport à blobatar** : React Native / Flutter, API déployée en ligne (Workers…) avec spec OpenAPI, « mur » d'avatars partagé (demande un backend).

## Repères dans le code

```
src/index.ts          rendu SVG, options, resolve()
src/traits.ts         listes de traits, axes, graine
src/shape.ts          silhouettes polaires des blobs, buildBody()
src/face.ts           yeux, bouches, sourcils, accessoires
src/color.ts          palette à contraste garanti
src/family.ts         contrat ShapeFamily
src/families/         animals, produce, kit (outils communs)
src/morph.ts          transition entre expressions
src/params.ts         parseParams / toParams (URL, attributs, CLI)
src/element.ts        <mochikao-avatar>
src/react.ts vue.ts solid.ts svelte/   composants
site/editor.ts        éditeur ; site/shared/ : thème, langues, familles du site
test/                 tests lib, composants, familles
```
