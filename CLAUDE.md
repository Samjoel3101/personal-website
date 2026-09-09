# Start here

A procedurally generated valley you **walk** through, drawn in WebGL. A trail
runs its whole length, from a pine forest through thinning woodland and dry
scrub into open desert — the ground keeps the same gentle roll the whole way,
drying out rather than turning to dunes, while ferns give way to cacti and a
pond to an oasis — and the camera walks that trail at eye level. Nothing in it
is hand-placed and nothing is a photograph.

The art direction is Quaternius's Stylized Nature MegaKit, and the trees, rocks
and undergrowth near you are the pack itself, fetched from a CC0 mirror. Further
out they are swapped for procedural shapes built in code to the same language —
that swap is what makes a five-thousand-triangle tree affordable in a forest of
two thousand of them. There are **two** swap radii, not one (`LOD` in
`src/config/render.js`): trees at 340 units, ground cover at 150, because there
are thirty times more plants than trees and instance count grows with the square
of the radius. With no assets fetched at all, the procedural shapes draw the
whole valley and it is still finished.

Most species have **several** models, not one, and which form a plant takes is a
hash of where it stands. One pine model for every pine was most of why the
forest read as synthetic.

**If you are picking up work on this repository, read this file, then
`docs/ARCHITECTURE.md`, then the task you were given. Nothing else is required
reading.**

## How work happens here: worktree-first

Every change — a feature, a bug fix, a doc edit — is made on a **fresh branch
inside its own git worktree**, off up-to-date `origin/main`. Never in the
primary checkout, never on `main`. A `PreToolUse` hook
(`.claude/hooks/require-worktree.mjs`) blocks edits that break that rule.

```bash
npm run wt:new -- <slug>            # ../personal-website-worktrees/<slug> on branch claude/<slug>
cd ../personal-website-worktrees/<slug>
# ...do the work, then...
npm run check
git push -u origin claude/<slug> && gh pr create
# after the PR merges:
cd -   &&   npm run wt:rm -- <slug>
```

The escape hatch `VALLEY_ALLOW_MAIN_WRITES=1` lets a write through on `main` or
in the primary checkout, and exists only for editing the harness itself or a
true hotfix. `docs/WORKTREE-WORKFLOW.md` is the full workflow.

## Get it running

```bash
npm install
npm run dev            # http://localhost:5173
```

There is no other setup. `dev` and `build` fetch the third-party models first
(`predev` / `prebuild`, cached after the first run), because nothing binary is
committed and the failure mode without them is silent: a fresh clone draws the
whole valley from procedural shapes and looks exactly like a broken model
pipeline. `window.__valley.debug.models` says how many species actually
upgraded, and the console says so too when none did.

## The commands that matter

| Command                             | What it does                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| `npm run dev`                       | Dev server with hot reload                                                                         |
| `npm run check`                     | **Run this before you finish.** Lint, format, boundaries, assets, tests, build                     |
| `npm test`                          | Unit tests (fast, no browser)                                                                      |
| `npm run test:watch`                | Unit tests in watch mode                                                                           |
| `npm run e2e`                       | Browser tests. Builds and previews first; slow but real                                            |
| `npm run lint` / `npm run lint:fix` | ESLint                                                                                             |
| `npm run format`                    | Prettier                                                                                           |
| `npm run assets:fetch -- --record`  | Download third-party models and pin their hashes (`dev`/`build` do the download part on their own) |
| `npm run assets:verify`             | Check the asset manifest and hashes                                                                |
| `npm run wt:new -- <slug>`          | Create a worktree on branch `claude/<slug>` off `origin/main` and `npm install` it                 |
| `npm run wt:list`                   | List the worktrees                                                                                 |
| `npm run wt:rm -- <slug>`           | Remove that worktree and delete its local branch (after the PR merges)                             |

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
   procedural shape, and it is what is drawn beyond `MODEL_DISTANCE` even when
   a model did arrive. A fresh clone with no `assets:fetch` run must look
   finished.

5. **One number drives the journey.** `journeyAt(x, z)` is 0 in the deep forest
   and 1 in the deep desert, and every other difference between the two ends —
   the height of the hills, the colour of the ground, the fog, which species
   are planted — is a blend keyed by it. Do not add a second notion of where
   the desert starts.

6. **Arrangement, not scatter.** Ground cover grows in stands: `src/world/patches.js`
   places six plant communities in a two-axis square (damp/open) and each
   species declares an affinity for them, while `src/world/shade.js` builds a
   canopy-cover field from the trees so ferns and mushrooms sit under them and
   dry grass sits in the clearings. Affinities are normalised by their own mean
   — they _redistribute_ a species, never add to it — so a new affinity cannot
   quietly rebalance the valley.

7. **The trail is the composition.** `src/world/path.js` owns one centre line;
   the terrain levels across it, the ground turns to earth on it, the planting
   refuses it and lines its edge with flowers, and the camera walks it at eye
   level. Anything that changes where the path goes has to keep it inside the
   valley, out of the pools, and gentle enough to walk — `tests/path.test.js`
   pins all three.

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
  gets its own material in `model-upgrade.js` with `vertexColors: false`, and a
  procedural shape always carries the attribute.
- **The pack's colour is in its UVs, not its vertices.** The MegaKit models are
  white-based-colour with a texture, and several of them share one atlas: all
  four grasses use a single image that is mostly white with a strip of colour
  bands down one edge, and green grass and gold grass differ only by which band
  their UVs land in. Their `COLOR_0` is a greyscale ambient-occlusion ramp and
  carries no hue at all. So `uv` must survive `normalisedParts` — dropping it
  turns the whole pack white — and recolouring a pack plant means moving UVs,
  not tinting. See `docs/SCENERY-DIAGNOSIS.md` §3.
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
- **Eye level is the whole design.** `CAMERA.HEIGHT` is 9 units, which is
  about a person; a unit is roughly a fifth of a metre, and every size in
  `src/config/flora.js` is scaled to that. Raising the camera above the canopy
  turns the scene back into a map of itself.
- **`finish` is flat by default, `{ smooth: true }` is not.** Rocks, cacti and
  conifers want hard facets; broadleaf crowns, bushes and flower heads want
  smooth normals and a vertical gradient, or they read as crystals. See
  `paintGradient` in `src/render/geometry/shapes.js`.
- **A fetched model wins, near the camera.** If you edit a procedural shape and
  the browser does not change, walk backwards: past `LOD.CANOPY_MODELS` (340)
  or `LOD.COVER_MODELS` (150) the procedural form is what draws. Half a day went
  into a boulder that turned out to be a grass-topped Kenney rock. `npm run
shoot -- --tier low` draws the whole valley procedurally, which is the fastest
  way to see what a fresh clone gets.
- **A model and the shape it replaces are not the same plant.** Both are
  normalised to unit height, so both are drawn at the species' `height` — but
  the pack's grass is a dense little clump where the procedural one is a few
  broad blades built to read from fifty units. Given the same height the near
  form towers over the far one and visibly grows as you walk up to it.
  `modelScale` on the species is what makes them meet; it is not a fudge.
- **`assets` is a list of choices, and a choice may be a list.** A string is one
  model; a nested array is _variants of the same thing_, all used, one per
  plant. The first choice that yields any model wins, so the Kenney fallbacks
  still work.
- **A fetched geometry may be quantised.** The MegaKit models are Meshopt-packed
  with 16-bit normalised positions, so `applyMatrix4` on them writes floats into
  an int16 array and produces a hundred-metre plank of bark. `normalisedParts`
  rebuilds every attribute as float first; do not remove that step. The loader
  also has to register `MeshoptDecoder`, or every model fails to parse and the
  scene silently falls back to procedural.
- **Two bands, not one.** The trail has a tight band where nothing grows
  (`pathFactor`) and a wide one that biases flowers and stones toward it
  (`vergeFactor`). Widening the first to get more flowers leaves the path
  sitting in a mown strip of bare earth. Trees keep back further still —
  `SCATTER.CANOPY_CLEARANCE` — because at eye level a trunk on the path's lip
  swallows the frame as you pass it.
- **A wide model sized by height becomes a wall.** Shapes are normalised to
  unit height, which is right for anything that stands up and a trap for
  anything that lies down: a stone four times wider than it is tall, scaled to
  a twenty-unit height, is an eighty-unit slab across the forest.
  `normalisedParts` caps that ratio — see the note in
  `src/render/model-upgrade.js`.
- **Ground cover scales with quality, canopy does not.** `createValley` takes a
  `groundCover` density; thinning it must never move a tree, and a test pins
  that. Density is applied to a cell's _occupancy_, not to its weights: once
  the floor is saturated — total weight well over one, which it is anywhere the
  undergrowth is thick — scaling weights thins nothing at all.
- **Mats carry the coverage, tufts carry the character.** The reference art has
  no bare ground: the green _is_ plants. One tuft per cell can never do that at
  any spacing the frame budget allows, so `grass-mat` and `dry-mat` are wide,
  low, cheap shapes that spread twice their own height, and the tufts stand in
  them. Because the planting gives each grid cell exactly one plant, mats
  winning cells costs nothing — the instance count is fixed by the grid.
- **The two `shade`s are different things.** The `shade` _community_ in
  `patches.js` is a place in the damp/open square; the `shade` _field_ in
  `shade.js` is how much canopy is actually overhead. A species can want one,
  the other, or both.

## Assets

Nothing binary is committed. `assets/manifest.json` declares every third-party
file with its licence, author and SHA-256; `npm run assets:fetch` downloads and
verifies them into `public/assets/`, and regenerates `CREDITS.md`. It runs
automatically before `dev` and `build`; a second run is a hash check and costs
nothing.

`npm run assets:verify` runs in CI and fails on an unlicensed entry, a missing
attribution or a hash mismatch. Add assets by editing the manifest, never by
dropping files into `public/`.

A manifest entry with `role: "flora"` replaces one species' procedural shape:
the id has to appear in that species' `assets` list in `src/config/flora.js`,
best first, or nothing ever requests it.

There are two provenances, and the difference is only about who fetches the
file:

- **remote** — a URL the fetch script downloads and pins. Everything remote is
  pinned to a commit on `raw.githubusercontent.com` rather than to a branch: a
  branch URL would fail its own recorded hash the next time upstream pushed.
- **local** — a file this environment cannot download. quaternius.com,
  itch.io, poly.pizza, kenney.nl, ambientcg.com and polyhaven.com are all
  blocked by the egress policy here, and the Quaternius pack is behind a
  download page in any case. A local entry still carries its licence, author
  and source, so `CREDITS.md` is complete either way, and it names the file it
  wants. To install one: download the pack, then

  ```bash
  npm run assets:link -- ~/Downloads/StylizedNatureMegaKit/glTF
  npm run assets:fetch -- --record     # pins the hashes of what landed
  ```

  `assets:link` matches the pack's file names against each slot's `match`
  keywords and copies the best one into place. A slot it cannot match keeps its
  procedural shape, which is always complete.

`assets:fetch` writes the manifest and `CREDITS.md` through Prettier, so a
`--record` run leaves `npm run check` green.

## What to work on next

`docs/ROADMAP.md` has the remaining work broken into discrete, specified tasks
with the files each one touches.
