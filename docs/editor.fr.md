# Construire un éditeur d'avatar

[English](editor.md) · **Français**

mochikao n'embarque pas d'éditeur, volontairement : l'apparence d'un sélecteur appartient à ton appli. Ce qu'il te donne, c'est tout ce qu'il faut pour en faire un, et le modèle est petit.

> Un avatar, c'est **`name` + options épinglées**. Tout ce que tu n'épingles pas est tiré du nom.

Un éditeur est donc un formulaire sur un objet simple (les *prefs*) que tu stockes et que tu repasses en options. Cette page décrit le modèle, les quelques endroits qui demandent de l'attention et une référence sans framework à adapter. Une version React est dans le [README](../README.fr.md#laisser-les-utilisateurs-personnaliser-leur-avatar).

## 1. Le modèle

```ts
import type { MochikaoOptions } from 'mochikao';

// Ce que tu stockes par utilisateur. Seules les clés touchées sont présentes.
type Prefs = Omit<MochikaoOptions, 'name' | 'family'>;

// Le rendu
mochikao({ name: user.id, family, ...prefs });
```

- **Épinglé** = la clé existe dans `prefs`. **Auto** = la clé est absente. Ne stocke jamais `undefined`, `null` ou `''` : supprime la clé (`mochikao` ignore `undefined`, mais ton JSON et tes diffs restent plus propres).
- Prends un **identifiant stable** comme `name`, pas un pseudo que l'utilisateur peut renommer.
- Garde `family` hors de `prefs` : c'est un choix que tu fais pour toute l'appli (ou que l'utilisateur fait, voir plus bas), et c'est un objet, pas une chaîne.

## 2. Quoi proposer

| Contrôle | Option | Choix |
| --- | --- | --- |
| Forme | `shape` | `family.shapes` (`blobs`, `animals`, `produce`, ou `mix(...)`) |
| Yeux | `eyes` | `EYES` |
| Bouche | `mouth` | `MOUTHS` |
| Accessoire | `extra` | `EXTRAS` |
| Couleur | `color` | `Object.keys(COLORS)` : un préréglage ton + saturation |
| Teinte | `hue` | 0–360 (curseur) |
| Réglage fin | `traits.<axe>` | curseurs 0–1, un par entrée de `CONTINUOUS_AXES` |
| Humeur | `expression` | `EXPRESSIONS` (en général un état de l'appli, pas une préférence stockée) |

Toutes les listes sont exportées par `mochikao`. Tu peux n'en proposer que certaines : moins on peut épingler de traits, plus deux utilisateurs restent différents.

## 3. Montrer ce que « auto » veut dire

Un contrôle qui affiche juste « auto » n'aide pas. `resolve()` renvoie ce que donne le nom, sans dessiner :

```ts
import { resolve } from 'mochikao';

const auto = resolve({ name: user.id, family });
auto.shape;       // 'frog'
auto.eyes;        // 'sleepy'
auto.hue;         // 140, déjà ajustée pour les familles à teinte naturelle
auto.traits.lean; // 0.62, position par défaut de ce curseur
```

Sers-t'en pour le libellé de l'option « auto » (`auto (sleepy)`) et pour la position de départ d'un curseur. Résous avec les **prefs actuelles** si tu veux des valeurs qui suivent ce qui est déjà épinglé (par exemple une teinte cohérente avec un `shape: 'lemon'` épinglé).

## 4. Les endroits qui demandent de l'attention

**Changer de famille supprime les formes qui n'existent plus.** Un `shape: 'frog'` épinglé ne veut rien dire dans `blobs` :

```ts
function withFamily(prefs: Prefs, family: ShapeFamily): Prefs {
  const { shape, ...rest } = prefs;
  return shape && family.shapes.includes(shape) ? prefs : rest;
}
```

**Les fruits et légumes ont une teinte naturelle** (un citron est jaune). Le nom ne la décale que de ±12°. Si l'utilisateur déplace le curseur de teinte, il l'épingle et cela l'emporte. Propose un « réinitialiser » pour revenir à la couleur naturelle.

**`color` et `tone`/`saturation`.** `color: 'pastel'` est un raccourci pour un couple ton + saturation ; un `tone` ou une `saturation` explicite l'emporte. Quand l'utilisateur choisit un préréglage, supprime ses `tone`/`saturation` explicites, sinon le préréglage a l'air de ne rien faire.

**Les axes continus sont dans `traits`.** Fusionne, ne remplace pas :

```ts
const setAxis = (p: Prefs, axis: (typeof CONTINUOUS_AXES)[number], v: number): Prefs =>
  ({ ...p, traits: { ...p.traits, [axis]: v } });
```

**« Aléatoire » est un autre nom, pas une autre graine.** Il n'y a pas d'option aléatoire, exprès (même entrée, même sortie). Pour laisser lancer les dés, garde une chaîne *variante* et rends avec `name: `${user.id}:${variant}``. Stocke la variante avec les prefs.

## 5. Une référence sans framework

Les réducteurs sont de simples fonctions : le même cœur marche en React, Vue, Svelte, Solid ou JS natif. Seul le rendu change.

```ts
import { CONTINUOUS_AXES, COLORS, EXTRAS, EYES, MOUTHS, mochikao, resolve, blobs, mix, type MochikaoOptions, type ShapeFamily } from 'mochikao';
import { animals } from 'mochikao/animals';
import { toParams, parseParams } from 'mochikao/params';

type Prefs = Omit<MochikaoOptions, 'name' | 'family'>;
type Choice = 'shape' | 'eyes' | 'mouth' | 'extra';

const family: ShapeFamily = mix(blobs, animals);

// --- transitions d'état pures : identiques dans tous les frameworks -----

export const pin = (p: Prefs, key: Choice, value: string): Prefs => ({ ...p, [key]: value });

export function unpin(p: Prefs, key: Choice | 'hue' | 'color'): Prefs {
  const { [key]: _removed, ...rest } = p;
  return rest;
}

export function setColor(p: Prefs, color: keyof typeof COLORS): Prefs {
  const { tone: _t, saturation: _s, ...rest } = p;
  return { ...rest, color };
}

export function setAxis(p: Prefs, axis: (typeof CONTINUOUS_AXES)[number], value: number): Prefs {
  return { ...p, traits: { ...p.traits, [axis]: value } };
}

// --- persistance -----------------------------------------------------

export const serialize = (p: Prefs) => toParams({ name: '', family: undefined, ...p }).toString();
export const load = (id: string, text: string) => {
  const { name: _n, family: _f, size: _s, ...prefs } = parseParams(id, new URLSearchParams(text), [animals]);
  return prefs as Prefs; // parseParams a écarté les valeurs invalides
};

// --- rendu (JS natif) ----------------------------------------------------

export function render(root: HTMLElement, id: string, prefs: Prefs, onChange: (next: Prefs) => void) {
  const auto = resolve({ name: id, family, ...prefs });
  const choices: Record<Choice, readonly string[]> = { shape: family.shapes, eyes: EYES, mouth: MOUTHS, extra: EXTRAS };

  const selects = (Object.keys(choices) as Choice[]).map((key) => {
    const options = [`<option value="">auto (${auto[key]})</option>`, ...choices[key].map((v) => `<option${prefs[key] === v ? ' selected' : ''}>${v}</option>`)];
    return `<label>${key} <select data-key="${key}">${options.join('')}</select></label>`;
  });

  root.innerHTML = `${mochikao({ name: id, family, size: 128, ...prefs })}${selects.join('')}`;
  root.querySelectorAll<HTMLSelectElement>('select').forEach((el) => {
    el.onchange = () => onChange(el.value ? pin(prefs, el.dataset.key as Choice, el.value) : unpin(prefs, el.dataset.key as Choice));
  });
}
```

`serialize` et `load` font l'aller-retour avec le même couple `toParams` / `parseParams` que l'API HTTP : une chaîne stockée peut être ajoutée à `/api/<id>.svg?` pour obtenir le même avatar n'importe où.

### Vue 3 (`<script setup>`)

Le même modèle en composant monofichier : `prefs` est un `v-model`, et le formulaire émet un nouvel objet à chaque changement. L'avatar vient de `mochikao/vue`.

```vue
<!-- AvatarEditor.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { Mochikao } from 'mochikao/vue';
import { EYES, MOUTHS, EXTRAS, resolve, mix, blobs, type MochikaoOptions } from 'mochikao';
import { animals } from 'mochikao/animals';

type Prefs = Omit<MochikaoOptions, 'name' | 'family'>;

const family = mix(blobs, animals);
const CHOICES = { shape: family.shapes, eyes: EYES, mouth: MOUTHS, extra: EXTRAS } as const;
type Key = keyof typeof CHOICES;
const KEYS = Object.keys(CHOICES) as Key[];

const props = defineProps<{ userId: string; modelValue: Prefs }>();
const emit = defineEmits<{ 'update:modelValue': [prefs: Prefs]; save: [prefs: Prefs] }>();

const auto = computed(() => resolve({ name: props.userId, family, ...props.modelValue }));

function pin(key: Key, value: string) {
  const { [key]: _removed, ...rest } = props.modelValue;
  emit('update:modelValue', value ? { ...rest, [key]: value } : rest);
}

function setHue(hue: number) {
  emit('update:modelValue', { ...props.modelValue, hue });
}
</script>

<template>
  <Mochikao :name="userId" :family="family" :size="128" v-bind="modelValue" />

  <label v-for="key in KEYS" :key="key">
    {{ key }}
    <select :value="modelValue[key] ?? ''" @change="pin(key, ($event.target as HTMLSelectElement).value)">
      <option value="">auto ({{ auto[key] }})</option>
      <option v-for="v in CHOICES[key]" :key="v">{{ v }}</option>
    </select>
  </label>

  <label>
    teinte
    <input type="range" min="0" max="360" :value="modelValue.hue ?? auto.hue"
           @input="setHue(+($event.target as HTMLInputElement).value)" />
  </label>

  <button @click="emit('save', modelValue)">Enregistrer</button>
  <button @click="emit('update:modelValue', {})">Réinitialiser</button>
</template>
```

```vue
<script setup lang="ts">
import { ref } from 'vue';
import AvatarEditor from './AvatarEditor.vue';

const prefs = ref(user.avatarPrefs);              // issu de ton API
</script>

<template>
  <AvatarEditor :user-id="user.id" v-model="prefs" @save="api.saveAvatar" />
</template>
```

Partout ailleurs, on l'affiche avec les mêmes deux lignes : `family` de ton thème, puis `v-bind="user.avatarPrefs"`.

## 6. Aperçus

Une tuile dans un sélecteur, c'est le même avatar avec une option changée :

```ts
const tile = (key: Choice, value: string) =>
  mochikao({ name: id, family, size: 46, ...prefs, [key]: value });
```

Pour les yeux et la bouche, 46 px est petit : recadre le `viewBox` sur le visage (`viewBox="22 28 56 56"`) avant d'insérer le SVG. Pour de longues listes de tuiles, utilise `mochikaoDataUri` dans un `<img>` plutôt qu'un SVG en ligne.

## 7. Valider côté serveur

Les prefs viennent d'un client : ne leur fais pas confiance. Les lire avec `parseParams` écarte tout ce qui n'est pas une valeur connue et borne les nombres, donc ce qui est stocké est toujours rendable par `mochikao()` :

```ts
const safe = parseParams(user.id, new URLSearchParams(body.prefs), [animals]);
```

## 8. Contraste : ce qui est garanti, et ce qui ne l'est pas

**Garanti.** Les yeux et la bouche (l'*encre*) contre le corps atteignent au moins **4.5:1**, pour toute teinte, tout ton, toute saturation, tout préréglage de couleur et toute famille. La palette ajuste la luminosité du corps jusqu'à ce que ce soit vrai, et les tests le vérifient sur toute la plage de teintes.

**Non garanti**, donc à garder en tête dans ton éditeur :

- **L'avatar contre ta page.** Le corps est ce que donnent la teinte et le ton. Un corps pâle (`pastel`, `pale`) sur une page blanche, ou sombre (`deep`, `ink`) sur un thème sombre, peut avoir une silhouette faible. Si l'avatar est le seul moyen de distinguer les utilisateurs, teste-le sur tes vrais fonds et dans les deux thèmes. WCAG demande 3:1 pour les graphiques nécessaires à la compréhension (1.4.11).
- **`background`** (`circle`, `squircle`, `square`) dessine une forme teintée derrière l'avatar, claire quand l'encre est sombre et sombre quand elle est claire. Cela aide la silhouette à se lire sur n'importe quelle page, mais cette teinte n'est pas non plus mesurée contre ta page.
- **Les accessoires et la décoration** (joues, reflet, pousse, couronne, chapeau, oreilles, tiges) sont décoratifs et ne sont pas mesurés contre le corps.
- **`tone` est une cible, pas une luminosité exacte.** Le corps est déplacé autant qu'il faut pour garder les 4.5:1 : près des extrêmes, deux positions du curseur peuvent donner la même couleur. Ne promets pas une valeur précise aux utilisateurs.

**L'interface de ton éditeur doit aussi respecter le contraste**, et c'est la partie la plus souvent oubliée :

- Les bordures de tuiles et les anneaux de focus ont besoin de **3:1** contre la page. Une bordure grise translucide (`#8884`) échoue souvent en thème sombre ; `currentColor` non.
- Montre la tuile sélectionnée et un curseur épinglé par **plus que la couleur** : bordure plus épaisse, coche, mot « épinglé ».
- N'abaisse pas l'opacité du texte secondaire sans vérifier le ratio obtenu (4.5:1 pour du texte normal).
- Vérifie les miniatures d'avatar sur le fond de tuile que tu utilises vraiment, clair et sombre.

## 9. Accessibilité et états

- Donne à l'avatar un `title` parlant (il devient `aria-label`), par exemple le nom affiché de l'utilisateur.
- Un sélecteur de visages est visuel : étiquette chaque tuile avec le nom de l'option, pas seulement l'image, et garde un `<select>` texte de secours comme celui ci-dessus.
- `expression` se pilote mieux par l'état de l'appli (`thinking` pendant l'enregistrement, `happy` après) et reste hors des prefs.
- Marque les tuiles à bascule avec `aria-pressed` et garde un style de focus visible : l'exemple complet fait les deux.
- `animate: 'hover'` respecte `prefers-reduced-motion` automatiquement. `gaze` (les yeux suivent le pointeur) est décoratif : n'y associe aucune information.

## Exemples

| | Ce qu'il montre | Où |
| --- | --- | --- |
| **Simple** | Un formulaire : forme, yeux, bouche, accessoire, teinte, enregistrer et réinitialiser | [README (React)](../README.fr.md#laisser-les-utilisateurs-personnaliser-leur-avatar), section 5 (JS natif), [Vue ci-dessus](#vue-3-script-setup) |
| **Complet** | Comme l'éditeur du site : modes de famille, une tuile par option, curseurs verrouillables pour chaque axe, préréglages de couleur, humeur, fond, aléatoire, lien de partage | [`examples/vue/AvatarEditor.vue`](../examples/vue/AvatarEditor.vue) |

L'exemple complet est un seul fichier Vue 3 à copier dans ton projet. Il ne fait pas partie du paquet npm.

## Référence

L'éditeur du projet ([`site/editor.ts`](../site/editor.ts), en ligne sur [mochikao.alexvolkihar.ovh/editor.html](https://mochikao.alexvolkihar.ovh/editor.html)) est une implémentation complète de ce modèle : verrous sur les traits épinglés, une tuile par option, un curseur par axe et des extraits de code générés.
