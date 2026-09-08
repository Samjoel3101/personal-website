# Forest to desert

A procedurally generated valley you walk through, drawn in WebGL. A trail runs
its whole length — a kilometre of it — from a pine forest through thinning
woodland and dry scrub into open desert, past a pond and an oasis, with hills
turning into dunes and ferns into cacti along the way.

Everything in it is generated: the terrain is a noise field, the trail is a
curve the terrain levels itself across, the ground colour is blended from four
biome palettes, and every tree, flower, rock and tuft of grass is placed by a
deterministic scatter and drawn from geometry built in code. Nothing is
hand-placed and nothing is a photograph. The art direction is Quaternius's
Stylized Nature MegaKit — bright, saturated, smooth crowns over faceted ground.

```bash
npm install
npm run dev      # http://localhost:5173
```

The first `dev` (or `build`) downloads the models it needs — a couple of
megabytes, cached afterwards. Nothing binary lives in this repository.

## Flying it

| Control                            | Does                      |
| ---------------------------------- | ------------------------- |
| Drag, or <kbd>Q</kbd>/<kbd>E</kbd> | Look around               |
| <kbd>W</kbd> / <kbd>S</kbd>        | Throttle forward and back |
| <kbd>A</kbd> / <kbd>D</kbd>        | Drift across the valley   |
| <kbd>Space</kbd>                   | Hold still                |

The camera drifts down the valley on its own and turns around at either end, so
it never arrives anywhere and stops.

## How it is built

Three ideas carry the whole thing:

- **The world model never imports the renderer.** `src/world` is plain
  JavaScript that runs in Node, so the terrain, the water and the planting are
  covered by fast unit tests rather than by looking at screenshots.
- **One number drives the journey.** `journeyAt(x, z)` runs 0 to 1 from forest
  to desert, and the hills, the colours, the fog and every species' density are
  blends keyed by it. There is no threshold anywhere that says "the desert
  starts here".
- **Assets are an upgrade, never a dependency.** Every species has a procedural
  shape. Optional models replace them if they are on disk; with none present
  the valley is complete.

## The models

The trees, rocks and undergrowth near the camera are [Quaternius's Stylized
Nature MegaKit](https://quaternius.com/packs/stylizednaturemegakit.html) (CC0),
pinned to a commit of a mirror at
[Samjoel3101/3d-assets](https://github.com/Samjoel3101/3d-assets) and fetched
by `npm run assets:fetch`. Kenney's Nature Kit fills the palm and cactus the
free tier does not include.

Past four hundred units each of them is swapped for a procedural shape, which
is what makes a five-thousand-triangle tree affordable in a forest of two
thousand. Species planted by the tens of thousands — grass, clover, pebbles,
flowers — stay procedural at every distance for the same reason.

Nothing binary is in this repository, and nothing here is required: with no
assets fetched the valley draws entirely from code and is still finished.

`docs/ARCHITECTURE.md` has the rest, and `CLAUDE.md` is the working brief for
anyone — human or agent — picking the project up.

## Commands

| Command                | What it does                                        |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | Dev server with hot reload                          |
| `npm run check`        | Lint, format, boundaries, assets, unit tests, build |
| `npm test`             | Unit tests                                          |
| `npm run e2e`          | Playwright tests against a real build               |
| `npm run assets:fetch` | Download the optional models and regenerate credits |

## Licence

MIT for the code. Third-party assets are listed with their licences in
`CREDITS.md` and declared in `assets/manifest.json`.
