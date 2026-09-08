# Forest to desert

A procedurally generated valley you fly through, drawn in WebGL. Five and a
half kilometres of it, running from a pine forest through thinning woodland and
dry scrub into open desert — hills into dunes, ferns into cacti, a pond into an
oasis.

Everything in it is generated: the terrain is a noise field, the ground colour
is blended from four biome palettes, and every tree, cactus, rock and tuft of
grass is placed by a deterministic scatter and drawn from geometry built in
code. Nothing is hand-placed and nothing is a photograph. The art direction is
Quaternius's Nature Mega Pack — flat-shaded, chunky, saturated.

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
  shape. Optional Kenney models replace them if `npm run assets:fetch` has been
  run; with none of them present the valley is complete.

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
