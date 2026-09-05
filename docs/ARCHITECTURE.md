# Architecture

## The one idea

The simulation does not know a renderer exists.

`src/world`, `src/physics`, `src/content` and `src/core` are plain JavaScript
that runs in Node. They describe a rally stage, a kart and a résumé; they hold
no reference to a canvas, a DOM node or a GPU. `src/render` reads that
description and draws it. `src/game/session.js` is the only module that imports
from both.

That boundary is load-bearing. It is why the entire renderer was replaced —
Canvas 2D to WebGL — without touching a line of physics, stage layout or
content, why the pastel city became a rally stage without the physics learning
a new word, and why the interesting logic is covered by fast unit tests instead
of screenshot comparisons.

## Data flow

```
content/resume.js ─┐
                   ├─> world/city.js ──> { scenery, cars, props, puddles,
config/world.js ───┘         │                boostPads, colliders, surfaceAt }
                             │                  │
   world/track.js ───────────┤                  ├──> physics/kart.js ──> kart state
   world/puddles.js ─────────┤                  │         │
   world/terrain.js ──┐      │                  │         └─ emits events
                      │      │                  │              │
                      └──────┴─> render/stage.js  <────────────┤
                                 ui/*, audio/*    <────────────┘
```

`createCity()` returns plain objects. The physics reads `colliders` and
`surfaceAt`. The renderer reads `scenery`, `cars`, `props` and `puddles`.
Neither knows about the other.

`world/terrain.js` is the exception that proves the rule: it lives in the world
model so it can be unit-tested without a GPU, but **only `src/render` reads
it**. See _Height is renderer-only_ below.

## The wrapping world

The stage is a 2048×2048 torus: drive off one edge and you arrive at the other.
This buys a world with no boundary — no invisible walls, no way to get
permanently lost, and no need for a circuit that closes.

It costs one rule: **no two positions may be compared by subtraction.**
`src/core/torus.js` provides `wrapDelta`, `wrapDistance` and `wrap`, and
everything that measures distance goes through them.

The renderer handles wrapping differently. Rather than moving the kart, it pins
the kart to the scene origin and slides the entire world underneath it, tiled
3×3 so there is always more stage in every direction. This means:

- the player never teleports when crossing the seam;
- floating-point precision never degrades far from the origin;
- and instanced meshes are built once, never rebuilt per frame.

The tiling holds only while the draw distance stays under half the world size,
which is why `ATMOSPHERE.FOG_FAR` is capped by `MAX_VISIBLE`.

Everything on the torus has to be seamless, and two things earn that the hard
way. `world/track.js` displaces each track line by
`TRACK.WOBBLE · sin(2π · along / BLOCK)`: the period divides `WORLD.SIZE`, so
the curve meets itself across the seam, and the sine is zero at every multiple
of `BLOCK / 2` — every junction _and_ every block midpoint — so the track passes
dead through the crossings and the boost pads with nothing special-cased.
`world/terrain.js` uses lattice cell sizes that divide `WORLD.SIZE` and wraps
its lattice index by bitmask, so `heightAt(x, z) === heightAt(x + SIZE, z)`.
Either one done naively puts a visible cliff or a kink along the seam.

## Height is renderer-only

The ground rolls, and **the simulation does not know**. `world/terrain.js` is a
pure function of position that `src/render` reads to lift the kart, the camera
and every piece of scenery onto a heightfield. Nothing in `src/physics` imports
it and no gameplay value is derived from it: collision, discovery and surface
sampling are as strictly two-dimensional as they were when the ground was flat.

That is a deliberate trade. Handling that depended on a heightfield would need
a gravity model, ground normals in the kart solver and a collision pass in
three dimensions — and the arcade feel this game is built around does not
survive one. What it costs is that a steep enough hillside is cosmetic: you
drive over it at the same speed you would drive over the flat.

To keep the two consistent where it matters, the terrain is exactly zero along
the track corridor and inside every landmark paddock, and a unit test pins
that. Flat where you drive, hills where you look.

## Rendering

Everything outside `src/render` talks to `src/render/stage.js` and nothing
else. It exposes five verbs — `resize`, `render`, `sampleFrameTime`,
`useKartModel`, `useSceneryModel` — and owns the context, the camera, the
scene, the post chain and the quality ladder.

Inside:

| Module               | Responsibility                                                  |
| -------------------- | --------------------------------------------------------------- |
| `renderer.js`        | The WebGL context. Sizing, tone mapping, shadow settings        |
| `scene.js`           | Assembles the scene; slides the city under the kart each frame  |
| `camera.js`          | Chase camera. Orbits a stationary kart                          |
| `lighting.js`        | One sun, one sky bounce, one flat ambient                       |
| `sky.js`             | Gradient dome, cloud shell, sun sprite                          |
| `postfx.js`          | Bloom, plus the multisampling that has to come with it          |
| `quality.js`         | Moves between quality tiers from measured frame intervals       |
| `materials.js`       | Shared Lambert cache. **Read the colour trap note**             |
| `facade-material.js` | Per-instance UV scaling so windows are size-correct             |
| `ground-follow.js`   | How things sit on the terrain: damped follow, and one-shot seat |
| `model-instances.js` | Normalises a loaded glTF and instances it, rather than cloning  |
| `builders/*`         | One builder per kind of thing in the world                      |
| `geometry/*`         | Merging, tiling, ribbons, heightfields, scenery shapes          |
| `textures/*`         | Canvas-generated textures: clouds, facades, labels              |

Two conventions run through `builders/` and `geometry/`:

- **Ribbons, not quads.** The track snakes, so every flat ground layer is a
  strip built by sampling the same `trackOffsetAt` the physics reads —
  `geometry/ribbon.js`. Their vertical order is the `GROUND_LAYER` ladder in
  `geometry/flat.js`, and the rule that a wider layer sits _below_ the one it
  flanks has not changed.
- **One unit box.** Every scenery shape in `geometry/scenery-shapes.js` is
  authored with x and z in [-0.5, 0.5] and y in [0, 1], so an instance's scale
  _is_ the collision box the physics already has. The picture and the thing you
  crash into cannot drift apart.

### Why Lambert and not PBR

The look is chunky and saturated. A physically based material lit brightly
enough to keep earth and moss saturated blows out its own highlights, and costs
roughly twice the fragment work. Lambert plus a low-contrast lighting rig gets
the intended image and pays for the draw distance. The rig is warmer and lower
than the pastel city's was — mud and rock carry shadow that a lilac facade
could not, and a heightfield lit from overhead is invisible.

Downloaded models keep whatever material they shipped with, which for the
rally kit is `MeshStandardMaterial`. Half a dozen instanced meshes of it is a
rounding error next to the ground.

### Quality ladder

`quality.js` watches frame intervals and moves between three tiers. It uses the
frame _interval_, not a timer around the render call: draw calls are queued and
the GPU finishes them after the function returns, so timing our own work
reports a small number on a machine that is visibly struggling. Coming back up
a tier has a cooldown, because raising quality costs exactly the frames that
made raising it look safe.

## The loop

`src/core/loop.js` runs physics at a fixed 120 Hz and renders once per animation
frame. Fixed-step physics means handling is identical on a 60 Hz laptop and a
144 Hz monitor, and that the same inputs produce the same drive. The loop caps
how much simulation one frame may absorb, so a backgrounded tab does not
tunnel the kart through a wall on the first frame back.

## Events

`src/core/emitter.js` is a twenty-line pub/sub. The physics announces
`kart:bump` and `kart:boost`; discovery announces `landmark:discovered`,
`landmark:revisited` and `tour:complete`. Audio and UI subscribe.

This exists so the simulation can stay ignorant of everything downstream. A
kart that called `playThudSound()` directly would not run in Node, and the
physics tests would need an AudioContext.

## Assets

`assets/manifest.json` is the only route by which a third-party file enters the
project. It carries licence, author, source and hash for every entry, and a
`role` saying what the asset is for — the runtime requests only roles it
actually uses, so reference material costs a visitor nothing. Exactly one entry
may carry `role: "kart"`; entries with `role: "scenery"` are all requested and
handed to `stage.useSceneryModel(id, model)`, which dispatches to whichever
builder knows what to do with that id.

URLs are pinned to a commit, never to a branch, or the recorded hash fails the
next time upstream pushes. One entry — the shared colour atlas — is never
requested by id at all; it only has to land in a `Textures/` directory beside
the models it belongs to, because they reference it by relative URI and
`GLTFLoader` resolves that against the model's own URL. Get that wrong and the
models load white rather than broken, which is much easier to miss.

`src/assets/loader.js` resolves to `null` rather than rejecting when an asset is
missing, and every builder has a procedural path. That is what makes a fresh
clone look finished. The scripts that regenerate `assets/manifest.json` and
`CREDITS.md` write through Prettier, so a `--record` run cannot leave
`npm run check` failing on its own output.

## Testing

- **Unit** (`tests/`, Vitest, no browser): the torus maths, seeded generation,
  the track curve, the terrain field, puddle placement, surface classification,
  stage invariants, collision, kart handling, content and manifest validation.
  Fast enough to run on every save.
- **End-to-end** (`e2e/`, Playwright): that WebGL initialises, that the scene
  draws, that driving works, that every landmark opens, and that resizing does
  not throw. Run serially — each test drives a real WebGL scene, and on a
  machine with no GPU parallel runs starve each other.

Stage invariants are worth singling out. Tests assert that every piece of
scenery clears the track's actual centre line — not its grid line, which a
snaking track leaves behind within a quarter of a block — that everything stays
inside its block, that parked vehicles leave a racing line clear, that no
puddle touches the dirt, and that the kart spawns on the track rather than
beside it. Each of those, broken, produces a bug that stays invisible until
somebody drives into that specific corner of the map.

The kart suite has one helper worth knowing about: `driveTrack`. A kart driven
in a straight line for more than a couple of seconds now ends up in a field, so
any test measuring the throttle or the top speed would be measuring the map.
Holding the kart on the centre line reproduces exactly the run those assertions
used to get from a straight road.
