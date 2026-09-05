# Start here

An interactive résumé you drive through: a WebGL kart racer around a
procedurally generated city, where each landmark opens a card with part of the
owner's background.

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

| Command                             | What it does                                                            |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`                       | Dev server with hot reload                                              |
| `npm run check`                     | **Run this before you finish.** Lint, format, assets, unit tests, build |
| `npm test`                          | Unit tests (fast, no browser)                                           |
| `npm run test:watch`                | Unit tests in watch mode                                                |
| `npm run e2e`                       | Browser tests. Builds and previews first; slow but real                 |
| `npm run lint` / `npm run lint:fix` | ESLint                                                                  |
| `npm run format`                    | Prettier                                                                |
| `npm run assets:fetch -- --record`  | Download third-party assets and pin their hashes                        |
| `npm run assets:verify`             | Check the asset manifest and hashes                                     |

## The five rules

1. **One responsibility per file.** ESLint enforces a 260-line ceiling and a
   90-line function ceiling. If you are fighting those limits, the file has
   taken on a second job — split it, do not raise the limit.

2. **The world model never imports the renderer.** `src/world`, `src/physics`,
   `src/content` and `src/core` must run in Node with no DOM and no WebGL. That
   is what makes them unit-testable, and it is why swapping the renderer was a
   contained change rather than a rewrite. A `three` import under any of those
   directories is a bug. `npm run check:boundaries` (part of `npm run check`)
   enforces this — it fails the build on a `three` import or an import
   reaching into `src/render`, `src/ui`, `src/audio`, `src/input`, `src/game`
   or `src/assets` from any of the four guarded directories.

3. **Never subtract two world coordinates directly.** The city wraps in both
   axes. Use `wrapDelta` / `wrapDistance` from `src/core/torus.js`. Raw
   subtraction works everywhere except across the seam, which is exactly the
   case nobody tests by hand.

4. **Assets are an upgrade, never a dependency.** Every builder must produce
   something complete with no assets present. A fresh clone with no
   `assets:fetch` run must look finished.

5. **Everything personal lives in `src/content/resume.js`.** No biography
   anywhere else.

## Where things are

```
src/
  config/      numbers, colours, tuning — no logic
  core/        maths, RNG, the torus helpers, the loop, an event bus
  content/     the résumé, and its schema
  world/       city layout and surface classification (pure data)
  physics/     kart handling and collision (pure)
  render/      everything WebGL; nothing outside talks past render/stage.js
  audio/       synthesised sound
  input/       keyboard and touch, both writing one input snapshot
  ui/          DOM overlays: HUD, minimap, cards, résumé view
  game/        the session that wires it all together
  assets/      the runtime asset loader and manifest view
```

## Traps that have already bitten someone

- **Instanced colours.** Setting `vertexColors: true` on a mesh whose geometry
  has no `color` attribute silently renders it black. Read the note at the top
  of `src/render/materials.js` before adding an instanced mesh.
- **Merging geometries.** `mergeGeometries` refuses a mix of indexed and
  non-indexed inputs and signals it by returning `null`, which fails much later
  as a null dereference. Use `mergeParts` from
  `src/render/geometry/merge.js`.
- **Ground layer order.** Flat road layers are coplanar; the pavement quad is
  wider than the road it flanks, so it must sit _below_ it. See
  `GROUND_LAYER` in `src/render/geometry/flat.js`.
- **Draw distance.** The city is tiled 3×3 to hide its edges, which only works
  while you cannot see more than half a world. Do not raise
  `ATMOSPHERE.FOG_FAR` past `MAX_VISIBLE` without increasing the tiling.
- **Boost pads.** They sit at every block midpoint. Any test that drives in a
  straight line for more than a couple of seconds will cross one, which will
  raise the speed you were expecting to fall.

## Assets

Nothing binary is committed. `assets/manifest.json` declares every third-party
file with its licence, author and SHA-256; `npm run assets:fetch` downloads and
verifies them into `public/assets/`, and regenerates `CREDITS.md`.

`npm run assets:verify` runs in CI and fails on an unlicensed entry, a missing
attribution or a hash mismatch. Add assets by editing the manifest, never by
dropping files into `public/`.

**Known limitation in some sandboxes:** kenney.nl, ambientcg.com,
polyhaven.com, poly.pizza and jsDelivr are blocked by egress policy in the
environment this was built in, so four manifest entries could not be fetched or
pinned here. They are marked `hostBlockedHere` and are all optional. Run
`npm run assets:fetch -- --record` somewhere with access and commit the
resulting hashes.

## What to work on next

`docs/ROADMAP.md` has the remaining work broken into discrete, specified tasks
with the files each one touches.
