# Plan: move the stage onto Quaternius art

Replace the stopgap procedural / Kenney scenery with two CC0 kits by
[Quaternius](https://quaternius.com):

- **Stylized Nature MegaKit** (free "Standard" tier, 68 models) — trees, rocks,
  ferns, grass, mushrooms.
- **LowPoly Buildings** (13 models) — houses, a shop, a bank, a hospital.

The kart stays as it is (Kenney rally buggy). Everything else on the stage moves
to Quaternius so the whole world reads as one hand.

This is a rework of ROADMAP item 3 ("More scenery models"), scaled up from "an
hour per model" because the delivery format needs a build step the repo does not
have yet.

---

## What already exists

A mirror repo — **`github.com/Samjoel3101/3d-assets`** — holds web-optimised,
commit-pinnable `.glb` builds of CC0 kits, so `assets/manifest.json` can pin a
model to a `raw.githubusercontent.com/<commit>/…` URL the same way the Kenney
entries already do.

| Directory                       | Kit                               | State                          |
| ------------------------------- | --------------------------------- | ------------------------------ |
| `quaternius-stylized-nature/`   | Nature MegaKit, 68 models, 5.4 MB | **pushed** — commit `60321950` |
| `quaternius-lowpoly-buildings/` | LowPoly Buildings                 | not built yet — Part 2 below   |

Every `.glb` there is a single self-contained file: 512px WebP textures
(`EXT_texture_webp`), quantised + Meshopt-compressed geometry
(`KHR_mesh_quantization`, `EXT_meshopt_compression`), no mesh simplification.
Build recipe: `scripts/optimize-gltf.sh` in that repo.

Unlike the Kenney kits, **the textures are baked into each `.glb`** — there is no
shared colour atlas to place in a sibling `Textures/` directory, so the manifest
gets no `role: "texture-atlas"` entry and the "models load white" trap does not
apply.

---

## Part 1 — Nature kit into the renderer

### N1. Teach the loader to read Meshopt geometry

**File:** `src/assets/loader.js`

The mirror's `.glb` files use `EXT_meshopt_compression`. `GLTFLoader` rejects
those unless a decoder is registered:

```js
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
// in createAssetLoader(), after `const gltf = new GLTFLoader();`
gltf.setMeshoptDecoder(MeshoptDecoder);
```

- ~10 KB gzipped into the `three` chunk (ROADMAP notes that chunk is already
  159 KB — call this out, it is the one real cost of the whole plan).
- Without it the models reject, `loader.js` catches it, builders fall back to
  procedural — the site stays green but shows nothing new. So this step gates
  every visible result below.
- Plain `.glb` files (the existing Kenney entries, if kept) still load — the
  decoder is only consulted for files that declare the extension.

Alternative if the chunk cost is unacceptable: rebuild the mirror with
`--compress quantize` instead of `meshopt` (no loader change, ~2× file size —
still ~10 MB for the whole kit, and only the fetched subset ships).

### N2. Manifest entries

**File:** `assets/manifest.json`, then `npm run assets:fetch -- --record`

Remove the nine `kit.nature.*` Kenney entries. Add, pinned to the mirror commit,
with `kind: "model"`, `license: "CC0-1.0"`, `author: "Quaternius"`,
`title: "Stylized Nature MegaKit"`,
`source: "https://quaternius.com/packs/stylizednaturemegakit.html"`,
`role: "scenery"`, `required: false`:

| id                          | file in mirror      | replaces       |
| --------------------------- | ------------------- | -------------- |
| `kit.nature.tree.broadleaf` | `CommonTree_3.glb`  | tree variant 0 |
| `kit.nature.tree.pine`      | `Pine_3.glb`        | tree variant 1 |
| `kit.nature.tree.spire`     | `Pine_5.glb`        | tree variant 2 |
| `kit.nature.rock.a`         | `Rock_Medium_1.glb` | rock variant 0 |
| `kit.nature.rock.b`         | `Rock_Medium_2.glb` | rock variant 1 |
| `kit.nature.rock.c`         | `Rock_Medium_3.glb` | rock variant 2 |

URL shape:
`https://raw.githubusercontent.com/Samjoel3101/3d-assets/<commit>/quaternius-stylized-nature/models/CommonTree_3.glb`

`assets:fetch --record` pins the hashes and rewrites `CREDITS.md` through
Prettier, so `npm run check` stays green. `tests/manifest.test.js` validates the
new entries automatically (CC0 is on the allow-list and needs no attribution
fields, but include them anyway to match the existing entries).

### N3. Point the tree builder at them

**File:** `src/render/builders/trees.js`

```js
const TREE_MODELS = ['kit.nature.tree.broadleaf', 'kit.nature.tree.pine', 'kit.nature.tree.spire'];
```

The index-slice fallback (`variantOf`, `useTreeModel`) already does the rest —
model N replaces variant N and hides that variant alone. Trees are sized by
`tree.height / aspect`, and `instancedModel` derives `aspect` from the model's
own bounds, so the Quaternius proportions come through correctly with no tuning.

The `kit.rally.forest` branch (copse upgrade) has no Quaternius equivalent —
there is no pre-merged forest patch. Leave the procedural copses in place for
now (drop nothing), or file a follow-up to merge a patch in the mirror pipeline.

### N4. Point the rock slices at them

**File:** `src/render/builders/scenery.js`

```js
const ROCK_MODELS = ['kit.nature.rock.a', 'kit.nature.rock.b', 'kit.nature.rock.c'];
```

`useSlice` already handles the swap. Rocks size by footprint (`size`), which is
right — they carry a collision box.

### N5. Check the flatten path, then verify

**File:** `src/render/model-instances.js` — read, likely no change

`flatten()` converts the model's `MeshStandardMaterial` to the scene's Lambert,
keeping `material.map`. The Quaternius material names (`Bark_NormalTree`,
`Leaves_NormalTree`, `Rocks`, …) match no key in `KIT_TINTS` or `KIT_SURFACES`,
so:

- the baked WebP texture is kept, `baseColorFactor` is white — correct;
- `projectUvs` does **not** run (good — Quaternius UVs are real texture maps and
  must be preserved, unlike Kenney's atlas-swatch UVs);
- `alphaTest` (0.2, from `alphaMode: MASK`) and `DoubleSide` carry over — correct
  for the leaf and fern cards;
- normal maps are dropped (Lambert path). Minor softening on bark. Optional:
  strip them at build time to save ~40 % of the tree files.
- Some meshes carry a `COLOR_0` attribute Quaternius uses for baked tint/AO.
  `flatten` produces a material without `vertexColors: true`, so it is ignored.
  If the foliage looks flat, setting `vertexColors: true` is safe here — the
  geometry has the attribute, so the trap in `materials.js` does not fire.

Then:

```
npm run check                 # lint, boundaries, manifest, unit, build
npm run e2e                    # CI fetches the models; smoke test exercises them
```

`e2e/smoke.spec.js` asserts zero console errors — a Meshopt file with no decoder
throws one, which is the backstop for N1.

---

## Part 2 — Buildings into the mirror repo

The LowPoly Buildings pack ships **FBX, OBJ, Blend — no glTF** — and the OBJ
materials lost their texture binding on export (flat grey `Kd`, no `map_Kd`).
The 32×32 palette PNGs are in the zip separately. No Blender or FBX2glTF in the
environment, so the path is OBJ → glTF → attach texture.

### B1. Convert

`obj2gltf` (npm, already resolvable) turns each `OBJ/*.obj` into a `.glb` with
`POSITION`, `NORMAL`, `TEXCOORD_0` and one material. Verified on `House.obj`:
285 KB raw, UVs intact.

UV coverage:

| Model                                        | UVs                            | Texture                                                                   |
| -------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------- |
| House, House2–5, Flat, Flat2, Hospital, Shop | yes                            | see below                                                                 |
| Bank                                         | **none** — 6225 verts, no `vt` | leave untextured (it is white marble in the pack preview — correct as-is) |

### B2. Attach the palette atlas

A ~15-line `@gltf-transform/core` script (prototyped, works): load the raw
`.glb`, `createTexture()` from the palette PNG, set it as `baseColorTexture` on
every material with **NEAREST** min/mag filter (it is a 32-colour swatch, not a
detail map), set `metallicFactor 0` / `roughnessFactor 1`.

Texture per model — assign by eye against `Preview.jpg`:

| Model                                  | Palette PNG                                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| House, House2–5, Flat, Flat2, Hospital | `HouseTexture1.png` (make 2–4 as colour variants from `HouseTexture2–4.png` for the same geometry) |
| Shop                                   | `Shop.png`                                                                                         |
| Bank                                   | none                                                                                               |

### B3. Optimise and commit

Run the same `optimize` step as the nature kit (`--compress meshopt`,
`--texture-compress false` — the PNG is already 228 bytes). Result ≈ 60–90 KB
per building (prototyped House: 67 KB). Land them in
`quaternius-lowpoly-buildings/models/` with `README.md`, `SOURCE-LICENSE.txt`
(the pack has no licence file — take the CC0 declaration from the OpenGameArt
page and Quaternius's site), `MODELS.md`. Commit; note the new hash for Part 3.

Fold the OBJ→texture→glb steps into `scripts/optimize-gltf.sh` as a second mode,
or a sibling `optimize-obj.sh`.

---

## Part 3 — Buildings into the renderer

**Files:** `assets/manifest.json`, `src/render/builders/scenery.js`

The stage has no standalone buildings — the "barn" slice already routes through
`HOUSE_MODELS` and `useSlice`. Repoint it:

```js
const HOUSE_MODELS = ['kit.building.house', 'kit.building.flat', 'kit.building.shop'];
```

(Currently two Kenney suburban entries; the array length is not fixed — `slice()`
and `addBarns` derive their count from `HOUSE_MODELS.length`, so adding a third
splits the barn sites three ways with no other change.)

Manifest entries mirror Part 1: `role: "scenery"`, `license: "CC0-1.0"`,
`author: "Quaternius"`,
`source: "https://opengameart.org/content/lowpoly-buildings-pack"`, pinned to
the buildings commit. Retire `kit.farm.house.a/b` and `kit.farm.atlas`.

`useSlice` sizes by footprint and applies a seeded quarter-turn, so a row of
plots is not three identical houses facing one way. Buildings carry a real
collision box already (they replace the barn boxes), so no physics change.

---

## Part 4 — Optional follow-ups

Each is a clean, independent addition — nothing below blocks Parts 1–3.

- **Ground detail scatter.** New `src/render/builders/ground-detail.js`: scatter
  `Fern_1`, `Grass_Common_Tall`, `Mushroom_Common`, `Pebble_Round_*` along the
  verge with a seeded RNG, instanced, seated via `terrain-surface.js`. Pure
  addition (upgrades from nothing). Decide: derive positions render-side from the
  track curve (render already reads `world/track.js`), or add `type: "detail"`
  props in `world/city.js` (needs a world change + `tests/city.test.js`).
- **Dead and twisted trees.** `DeadTree_2`, `TwistedTree_3` as roadside / landmark
  character. Needs a 4th and 5th tree slot — touch `VARIANTS` in `trees.js` and
  the tree generation in `world/city.js` — or route them through `scenery.js` as
  fixed decorative props near landmarks.
- **A landmark building.** Let one Quaternius building (the bank, the hospital)
  stand in for one of the six résumé landmarks. `addLandmarks` has no model hook
  today; adding one means matching the building footprint to the landmark
  paddock and keeping the card trigger. Higher effort, high payoff for the hero
  shots.
- **Merged forest patch** for the `kit.rally.forest` copse upgrade (see N3).

---

## Risks and decisions

| Question                                                             | Recommendation                                                                                        |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Meshopt (loader change, +10 KB gz) vs quantize (no change, 2× files) | **Meshopt.** The whole point was the page budget; the decoder is standard three.js.                   |
| Keep any Kenney scenery?                                             | **No.** Retire `kit.nature.*` and `kit.farm.*`. Mixed kits is the look we are leaving. Keep the kart. |
| Normal maps on trees                                                 | Strip at build. Lambert drops them anyway.                                                            |
| Buildings: Bank with no UVs                                          | Ship untextured — it is white marble in the pack art.                                                 |
| Where scatter positions live                                         | Start render-side off the track curve; promote to the world model only if a test needs them.          |

## Sequencing

1. **N1** (loader) — 20 min, unblocks everything.
2. **N2–N5** (nature wiring) — half a day. Ship it, look at it in-browser.
3. **B1–B3** (buildings → mirror) — half a day, mostly the texture-assignment pass.
4. **Part 3** (buildings wiring) — 2 hours.
5. **Part 4** — as appetite allows.

Update `docs/ROADMAP.md` when Parts 1–3 land: item 3 is done, and the "no
buildings" note under _Done_ is no longer true.
