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

## Using the Quaternius pack

The look is modelled on [Quaternius's Stylized Nature
MegaKit](https://quaternius.itch.io/stylized-nature-megakit) (CC0). The pack is
behind a download page rather than at a URL, so it is not vendored here and the
build environment cannot fetch it. To use the real meshes:

```bash
# download and unzip the pack, then:
npm run assets:link -- ~/Downloads/StylizedNatureMegaKit/glTF
npm run assets:fetch -- --record     # pins the hashes of what landed
npm run dev
```

`assets:link` matches the pack's file names onto the manifest's slots — pine,
birch, maple, bush, rock, cactus, flowers and the rest — and copies them into
`public/assets/`. Anything it cannot match keeps its procedural shape. Kenney's
Nature Kit is pinned as a fallback and is fetched automatically.

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
