# Architecture

## The one idea

The simulation does not know a renderer exists.

`src/world`, `src/physics`, `src/content` and `src/core` are plain JavaScript
that runs in Node. They describe a city, a kart and a résumé; they hold no
reference to a canvas, a DOM node or a GPU. `src/render` reads that description
and draws it. `src/game/session.js` is the only module that imports from both.

That boundary is load-bearing. It is why the entire renderer was replaced —
Canvas 2D to WebGL — without touching a line of physics, city layout or
content, and why the interesting logic is covered by fast unit tests instead of
screenshot comparisons.

## Data flow

```
content/resume.js ─┐
                   ├─> world/city.js ──> { buildings, cars, props, surfaceAt }
config/world.js ───┘                            │
                                                ├──> physics/kart.js ──> kart state
                                                │         │
                                                │         └─ emits events
                                                │              │
                                                ├──> render/stage.js  <──┤
                                                └──> ui/*, audio/*  <────┘
```

`createCity()` returns plain objects. The physics reads `colliders` and
`surfaceAt`. The renderer reads `buildings`, `cars` and `props`. Neither knows
about the other.

## The wrapping world

The city is a 2048×2048 torus: drive off one edge and you arrive at the other.
This buys a world with no boundary — no invisible walls, no way to get
permanently lost, and no need for a track that loops.

It costs one rule: **no two positions may be compared by subtraction.**
`src/core/torus.js` provides `wrapDelta`, `wrapDistance` and `wrap`, and
everything that measures distance goes through them.

The renderer handles wrapping differently. Rather than moving the kart, it pins
the kart to the scene origin and slides the entire city underneath it, tiled
3×3 so there is always more city in every direction. This means:

- the player never teleports when crossing the seam;
- floating-point precision never degrades far from the origin;
- and instanced meshes are built once, never rebuilt per frame.

The tiling holds only while the draw distance stays under half the world size,
which is why `ATMOSPHERE.FOG_FAR` is capped by `MAX_VISIBLE`.

## Rendering

Everything outside `src/render` talks to `src/render/stage.js` and nothing
else. It exposes four verbs — `resize`, `render`, `sampleFrameTime`,
`useKartModel` — and owns the context, the camera, the scene, the post chain
and the quality ladder.

Inside:

| Module               | Responsibility                                                 |
| -------------------- | -------------------------------------------------------------- |
| `renderer.js`        | The WebGL context. Sizing, tone mapping, shadow settings       |
| `scene.js`           | Assembles the scene; slides the city under the kart each frame |
| `camera.js`          | Chase camera. Orbits a stationary kart                         |
| `lighting.js`        | One sun, one sky bounce, one flat ambient                      |
| `sky.js`             | Gradient dome, cloud shell, sun sprite                         |
| `postfx.js`          | Bloom, plus the multisampling that has to come with it         |
| `quality.js`         | Moves between quality tiers from measured frame intervals      |
| `materials.js`       | Shared Lambert cache. **Read the colour trap note**            |
| `facade-material.js` | Per-instance UV scaling so windows are size-correct            |
| `builders/*`         | One builder per kind of thing in the world                     |
| `geometry/*`         | Merging, tiling and flat-quad helpers                          |
| `textures/*`         | Canvas-generated textures: clouds, facades, labels             |

### Why Lambert and not PBR

The look is flat and saturated. A physically based material lit brightly enough
to keep pastel facades saturated blows out its own highlights, and costs
roughly twice the fragment work. Lambert plus a deliberately low-contrast
lighting rig gets the intended image and pays for the draw distance.

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
actually uses, so reference material costs a visitor nothing.

`src/assets/loader.js` resolves to `null` rather than rejecting when an asset is
missing, and every builder has a procedural path. That is what makes a fresh
clone look finished.

## Testing

- **Unit** (`tests/`, Vitest, no browser): the torus maths, seeded generation,
  surface classification, city invariants, collision, kart handling, content
  and manifest validation. Fast enough to run on every save.
- **End-to-end** (`e2e/`, Playwright): that WebGL initialises, that the scene
  draws, that driving works, that every landmark opens, and that resizing does
  not throw. Run serially — each test drives a real WebGL scene, and on a
  machine with no GPU parallel runs starve each other.

City invariants are worth singling out. Tests assert that no building sits on a
road, that every building stays inside its block, and that parked cars leave a
driving lane clear. Each of those, broken, produces a bug that stays invisible
until somebody drives into that specific corner of the map.
