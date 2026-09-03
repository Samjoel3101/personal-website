# Kart Résumé

An interactive résumé you drive through. A kart, a procedurally generated city,
and six landmarks — each one opens a card with part of my background.

Rendered with a SNES-style **Mode 7** ground raster: for every scanline below
the horizon the renderer works out how far away that line of the world is, then
walks across the row sampling a city texture with a constant per-pixel step.
Buildings sit on top as real projected boxes sharing the same focal length, so
perspective agrees between the road and the skyline.

## No asset files

There are no images, no sprite sheets, no audio files, no 3D models, and no
rendering library in this repository. Everything is generated in the browser at
load time:

| Thing | How it is made |
| --- | --- |
| City texture (2048²) | Canvas fills + noise tiles, `js/tilemap.js` |
| Buildings | Flat-shaded boxes projected per frame, `js/mode7.js` |
| Kart, trees, lamps, signs | Canvas draw calls into offscreen buffers, `js/sprites.js` |
| Sky and skyline | Gradient + procedural cloud and building silhouettes |
| Engine, boost, chimes, impacts | Web Audio oscillators and noise buffers, `js/audio.js` |
| Physics | Hand-rolled arcade model, `js/kart.js` |

The only external resource on the whole site is the Press Start 2P webfont, and
it is loaded non-blocking with a monospace fallback — the site works fully
without it.

## Making it yours

Edit **`js/content.js`**. That is the only file with anything personal in it:
your name, contact links, and the six landmark cards. The game world, the
minimap, the compass, and the plain-text résumé all read from it.

To move a landmark, keep its `x`/`z` on a block centre — a combination of
`256`, `768`, `1280`, `1792` — or it will end up inside a building.

## Running it

It is a static site with no build step:

```bash
npx http-server -p 8000 .   # or: python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Deploying

Push to GitHub, then **Settings → Pages → Build and deployment → Deploy from a
branch**, and pick the branch with the site root. No build configuration is
needed.

## Controls

| Input | Action |
| --- | --- |
| `W` / `↑` | Accelerate |
| `S` / `↓` | Brake, then reverse |
| `A` `D` / `←` `→` | Steer |
| `Shift` / `Space` | Drift |
| `M` | Mute |
| `Esc` / `Enter` | Close a card |

On a touch device the on-screen pedals and steering buttons appear
automatically.

## Notes

- The city is a torus: drive off one edge and you arrive at the other, so there
  are no invisible walls and you cannot get permanently lost.
- The layout is seeded, so it is identical on every visit.
- Physics runs at a fixed 120 Hz regardless of display refresh rate.
- The kart sprite is re-rasterised whenever the buffer resizes, so it is
  drawn 1:1 and never resampled.
- **Text version** in the HUD renders the same content as an ordinary scrolling
  page, for anyone who would rather not play a game to read a résumé.

## Layout

```
index.html          markup and overlays
css/style.css       arcade chrome
js/core.js          world constants, RNG, wrap-aware maths
js/content.js       ← your résumé lives here
js/tilemap.js       city layout, ground texture, surface map
js/sprites.js       every bitmap in the game
js/mode7.js         the renderer
js/kart.js          physics and collision
js/audio.js         synthesised sound
js/game.js          loop, input, HUD, cards
```
