# The stage art: what the models are, and how they got here

The trees, rocks, buildings and every vehicle on the stage are CC0 kits,
repacked and served from a mirror. The ground, the track ribbon and the sky
stay procedural — that is the intended look, not a stopgap, and a texture or
tile pass fights it (see `docs/ROADMAP.md`).

## The mirror

**`github.com/Samjoel3101/3d-assets`** repacks CC0 kits into web-optimised
`.glb` so `assets/manifest.json` can pin a model to a
`raw.githubusercontent.com/<commit>/…` URL — the same mechanism the older Kenney
entries use.

| Directory                       | Upstream                           | Used for                          |
| ------------------------------- | ---------------------------------- | --------------------------------- |
| `quaternius-stylized-nature/`   | Quaternius Stylized Nature MegaKit | tree variants, rocks (6 of 68)    |
| `quaternius-lowpoly-buildings/` | Quaternius LowPoly Buildings       | farmhouse + outbuilding           |
| `kenney-car-kit/`               | Kenney Car Kit                     | player kart, parked + moving cars |
| `kenney-3d-road-tiles/`         | Kenney 3D Road Tiles               | nothing yet — see ROADMAP item 5  |

Every `.glb` is one self-contained file: 512px WebP textures baked in,
`KHR_mesh_quantization` + `EXT_meshopt_compression` geometry, no mesh
simplification. Recipe: `scripts/` in the mirror repo. Rebuild and commit; the
manifest pins the new commit hash.

Buildings needed an extra step — the pack ships OBJ with no texture binding, so
`scripts/attach-obj-texture.mjs` reattaches the 32px palette atlas after
`obj2gltf`.

## How it wires in

- **`src/assets/loader.js`** registers `MeshoptDecoder` — without it `GLTFLoader`
  rejects every mirror `.glb` (caught, falls back to procedural, so the failure
  is silent). Costs ~7 KB gzipped on the `three` chunk.
- **`src/render/model-instances.js`** — `normalisedParts` bakes POSITION/NORMAL
  to float before `applyMatrix4`. The quantised int16 positions wrap otherwise
  and the mesh shatters. This is the single load-bearing fix; it also un-broke
  the first attempt at the trees.
- **`src/render/builders/trees.js`** — `TREE_MODELS` maps the three procedural
  tree variants to `kit.nature.tree.{broadleaf,pine,spire}`. The pine also
  stands up the copse trees, at the world's own copse layout so a stand does
  not become a wall.
- **`src/render/builders/scenery.js`** — `ROCK_MODELS` →
  `kit.nature.rock.{a,b,c}`; `HOUSE_MODELS` → `kit.building.{house,cottage}`
  over the two barns each farm block now carries.
- **`src/render/builders/cars.js`** — `buildCars` gains `useModel`.
  `kit.car.parked` (van) instances over the lay-by vehicles; `kit.car.traffic`
  (hatchback) over the moving ones, re-seated each frame from the simulation.
  Instanced, so their wheels do not spin.
- **`src/render/builders/kart.js`** unchanged — the player kart
  (`kit.car.player`, the Car Kit race car) loads through the existing
  `useModel` / named-wheel path, which is why its wheels _do_ spin.

Everything still no-ops cleanly when a model is absent: a fresh clone with no
`assets:fetch` run is the full procedural stage.

## Deferred (ROADMAP items 3 and 5)

- Ground detail — ferns, grass, mushrooms, pebbles, dead/twisted trees, cones —
  all in the mirror, none scattered yet.
- The road tiles. Wrong era of Kenney art for this look, and a tile track is a
  `world/track.js` rewrite, not an asset swap.
- Player-kart choice is the one subjective call — swap the `kit.car.player`
  file for any other Car Kit model.
