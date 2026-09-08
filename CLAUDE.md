# Start here

A procedurally generated valley you fly through, drawn in WebGL. It runs five
and a half kilometres from a pine forest, through thinning woodland and dry
scrub, into open desert — hills into dunes, ferns into cacti, a pond into an
oasis. Nothing in it is hand-placed and nothing is a photograph.

The art direction is Quaternius's Nature Mega Pack: flat-shaded, chunky,
saturated, a species reduced to a dozen facets. Everything you see is built in
code to that language; fetched models are an optional upgrade, never a
dependency.

**If you are picking up work on this repository, read this file, then
`docs/ARCHITECTURE.md`, then the task you were given. Nothing else is required
reading.**

## Get it running

```bash
npm install
npm run dev            # http://localhost:5173
```

There is no other setup. Third-party assets are optional — see _Assets_ below.

## The commands that matter

| Command                             | What it does                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`                       | Dev server with hot reload                                                     |
| `npm run check`                     | **Run this before you finish.** Lint, format, boundaries, assets, tests, build |
| `npm test`                          | Unit tests (fast, no browser)                                                  |
| `npm run test:watch`                | Unit tests in watch mode                                                       |
| `npm run e2e`                       | Browser tests. Builds and previews first; slow but real                        |
| `npm run lint` / `npm run lint:fix` | ESLint                                                                         |
| `npm run format`                    | Prettier                                                                       |
| `npm run assets:fetch -- --record`  | Download third-party models and pin their hashes                               |
| `npm run assets:verify`             | Check the asset manifest and hashes                                            |

## The five rules

1. **One responsibility per file.** ESLint enforces a 260-line ceiling and a
   90-line function ceiling. If you are fighting those limits, the file has
   taken on a second job — split it, do not raise the limit.

2. **The world model never imports the renderer.** `src/world`, `src/core` and
   `src/config` must run in Node with no DOM and no WebGL. That is what makes
   the terrain, the planting and the palette unit-testable without a GPU, and
   it is why the whole scene can be regenerated and inspected in a test in two
   seconds. A `three` import under any of those directories is a bug.
   `npm run check:boundaries` (part of `npm run check`) fails the build on one,
   or on an import reaching into `src/render`, `src/ui`, `src/input`,
   `src/app` or `src/assets`.

3. **Nothing stands on the analytic terrain.** `heightAt` is a smooth field;
   the ground you can see is flat triangles between lattice samples of it, and
   between them the two disagree by several units. Everything seated on the
   ground — a tree, a rock, the camera — reads `surfaceHeight` instead, which
   reproduces the mesh's own triangles. Use the analytic field only to build
   the lattice.

4. **Assets are an upgrade, never a dependency.** Every species has a
   procedural shape. A fresh clone with no `assets:fetch` run must look
   finished.

5. **One number drives the journey.** `journeyAt(x, z)` is 0 in the deep forest
   and 1 in the deep desert, and every other difference between the two ends —
   the height of the hills, the colour of the ground, the fog, which species
   are planted — is a blend keyed by it. Do not add a second notion of where
   the desert starts.

## Where things are

```
src/
  config/      numbers, colours, species tables, tuning — no logic
  core/        maths, colour arithmetic, noise, RNG, the frame loop
  world/       terrain, biomes, water, planting — pure data, runs in Node
  render/      everything WebGL; nothing outside talks past render/stage.js
  input/       keyboard, mouse and touch, all writing one snapshot
  ui/          DOM overlays: the title card and the HUD
  app/         the session that wires it all together
  assets/      the runtime asset loader and manifest view
```

## Traps that have already bitten someone

- **The colour trap.** `vertexColors: true` on a geometry with no `color`
  attribute renders black, silently. Read the note at the top of
  `src/render/materials.js` before adding an instanced mesh — a fetched glTF
  has no colour attribute and a procedural shape always does.
- **Merging geometries.** `mergeGeometries` refuses a mix of indexed and
  non-indexed inputs and signals it by returning `null`, which fails much later
  as a null dereference. Use `mergeParts` from `src/render/geometry/merge.js`.
- **The unit contract.** Every shape in `src/render/geometry` is one unit tall,
  centred on x and z, base at y = 0, and is placed with a single uniform scale
  equal to its height. A shape that ignores that comes out buried, floating or
  stretched.
- **The triangle split is shared.** `buildHeightfield` splits each cell
  (a, b, c) and (a, c, d); `surfaceHeight` in `src/world/terrain.js`
  reproduces it. Change one and change both, or the whole valley starts
  floating over its own ground.
- **A pool's level is not in the config.** It is the natural terrain height at
  the pool's centre, because a fixed water level in a landscape that rolls is a
  pond halfway up a hill. The basin carve is total out to a little past the
  waterline for the same reason — see `basinFactor`.
- **Instancing is chunked.** Each species is split into slabs along z so the
  frustum can reject most of them. A new instanced mesh needs
  `computeBoundingSphere()` or it will be culled at the wrong moment, usually
  by vanishing when you look straight at it.
- **A fetched model wins.** If you edit a procedural shape and the browser
  does not change, that species has an `asset` in `src/config/flora.js` and you
  have run `assets:fetch`: what you are looking at is the model, repainted by
  `KIT_TINTS`. Half a day went into a boulder that turned out to be a
  grass-topped Kenney rock.
- **Ground cover scales with quality, canopy does not.** `createValley` takes a
  `groundCover` density; thinning it must never move a tree, and a test pins
  that.

## Assets

Nothing binary is committed. `assets/manifest.json` declares every third-party
file with its licence, author and SHA-256; `npm run assets:fetch` downloads and
verifies them into `public/assets/`, and regenerates `CREDITS.md`.

`npm run assets:verify` runs in CI and fails on an unlicensed entry, a missing
attribution or a hash mismatch. Add assets by editing the manifest, never by
dropping files into `public/`.

A manifest entry with `role: "flora"` replaces one species' procedural shape:
the id has to match the `asset` field of a species in `src/config/flora.js`, or
nothing ever requests it. Everything is pinned to a commit on
`raw.githubusercontent.com` rather than to a branch — quaternius.com,
poly.pizza, kenney.nl, ambientcg.com and polyhaven.com are all blocked by the
egress policy this is built under, and a branch URL would fail its own recorded
hash the next time upstream pushed.

`assets:fetch` writes the manifest and `CREDITS.md` through Prettier, so a
`--record` run leaves `npm run check` green.

## What to work on next

`docs/ROADMAP.md` has the remaining work broken into discrete, specified tasks
with the files each one touches.
