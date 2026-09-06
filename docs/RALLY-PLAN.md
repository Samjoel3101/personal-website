# Rally scenery: plan

Turn the pastel city into a muddy backcountry rally stage — the _Angry Birds
Go!_ register: chunky low-poly forms, saturated earth and moss, a winding dirt
track cut through hills, puddles, hay bales and spectator tents.

The résumé is untouched. `src/content/resume.js` and `src/content/schema.js`
do not change: the six landmarks keep their ids, coordinates and `style` keys —
only the geometry those styles produce is restyled.

**Read `CLAUDE.md` and `docs/ARCHITECTURE.md` first. Every rule in them still
applies, especially the five rules and the traps.**

---

## 1. What the site becomes

| Today                              | After                                                         |
| ---------------------------------- | ------------------------------------------------------------- |
| Flat ground, straight asphalt grid | Rolling heightfield, dirt track that snakes between junctions |
| Pastel tower blocks in lots        | Rock outcrops, pine stands, barns, hay stacks, open meadow    |
| Kerbs, lane paint, zebra crossings | Tyre ruts, mud edges, corner marker poles, chevron ramps      |
| Pavement + grass + plaza surfaces  | Verge, field, mud, paddock — mud actually punishes you        |
| Blue midday city sky               | Warm low sun, hazy horizon, heavier cloud                     |
| Procedural kart, no models used    | Kenney CC0 rally truck, forest patches, tents, finish gantry  |

Everything above must still be complete with **no assets fetched** (rule 4).
The models are an upgrade; the procedural path stays the reference look.

---

## 2. Assets: what is actually obtainable

### 2.1 What was checked

Every host the manifest already names — kenney.nl, ambientcg.com,
polyhaven.com, poly.pizza, jsDelivr, opengameart.org — answers `403` to
`CONNECT` through this environment's egress proxy. They are unreachable here
and will stay that way.

`raw.githubusercontent.com` **is** reachable, for any public repository. That
is the route to use: several first-party CC0 asset packs are published on
GitHub, so they can be fetched, hashed and pinned from inside this sandbox
rather than left as `hostBlockedHere` aspirations.

### 2.2 The pack to use

[Kenney's Starter Kit Racing](https://github.com/KenneyNL/Starter-Kit-Racing) —
MIT-licensed repository whose README states: _"Assets included in this package
(2D sprites, 3D models and sound effects) are CC0 licensed."_ It is the closest
existing free art to the target look: stylised, chunky, low-poly, one shared
colour-atlas material.

Verified by download in this environment (HTTP 200, hashes below, pinned to
commit `ca4d2e18e148474fc9ac5639e1c68d2a73c1225a`):

| File                    | Bytes   | Contents (read from the glTF JSON chunk)                                     |
| ----------------------- | ------- | ---------------------------------------------------------------------------- |
| `vehicle-truck-red.glb` | 92,436  | Nodes `body`, `wheel-front-left/right`, `wheel-back-left/right`, `underside` |
| `decoration-forest.glb` | 189,784 | One merged 10×10×5.3 patch of conifers and rocks                             |
| `decoration-tents.glb`  | 168,004 | One merged 10×10×4.2 spectator camp                                          |
| `track-finish.glb`      | 24,544  | Start/finish gantry, 10 units wide                                           |
| `Textures/colormap.png` | 10,219  | The shared atlas **every one of the above references by relative URI**       |

Facts the implementation depends on:

- Models are **Y-up, centred on X/Z, base at y = 0**, authored on a 10-unit
  tile. The truck is 1.5 × 1.2 × 2.8 (W × H × L), long axis on **Z** — the
  axis `normaliseToLength` in `src/render/builders/kart.js` already expects.
- Each glb references `Textures/colormap.png` **relatively**. `GLTFLoader`
  resolves that against the glb's own URL, so the atlas must land at
  `public/assets/models/rally-kit/Textures/colormap.png`, a sibling `Textures/`
  directory next to the models. Get this wrong and the models load untextured
  (white), not broken — a silent, easy-to-miss failure.
- Wheels are named, which is exactly what roadmap item 3 said was missing.

### 2.3 Manifest entries to add

Add to `assets/manifest.json`, URLs pinned to the commit above (a `main` URL
would drift and fail its hash on the next upstream commit):

```
https://raw.githubusercontent.com/KenneyNL/Starter-Kit-Racing/ca4d2e18e148474fc9ac5639e1c68d2a73c1225a/models/<file>
```

| id                 | file                                     | role            | sha256                                                             |
| ------------------ | ---------------------------------------- | --------------- | ------------------------------------------------------------------ |
| `kit.rally.kart`   | `models/rally-kit/vehicle-truck-red.glb` | `kart`          | `eca99bd9ab0a2b02125f915e65d1ec8f1c5a93be7c6d4840efdac6633f47772c` |
| `kit.rally.atlas`  | `models/rally-kit/Textures/colormap.png` | `texture-atlas` | `02bb3fb87365927d16e265d27caae405aeef5819b6bde5a989ff5e435318de4d` |
| `kit.rally.forest` | `models/rally-kit/decoration-forest.glb` | `scenery`       | `664a53f0f709fef9096af3bbfb1aa76536527a616b05170c0cf4e27e33358a00` |
| `kit.rally.tents`  | `models/rally-kit/decoration-tents.glb`  | `scenery`       | `19dbf2a778ad75f95c7d61f12866ef7174ab69cad169d3749c5400f5e14db8a3` |
| `kit.rally.gantry` | `models/rally-kit/track-finish.glb`      | `scenery`       | `2fec3b681658d6e77e20c4342d1e3ceeaab3e8d2fbf340942cde25cc2b21975b` |

All five: `"license": "CC0-1.0"`, `"author": "Kenney"`,
`"source": "https://github.com/KenneyNL/Starter-Kit-Racing"`,
`"required": false`, `"kind": "model"` (`"texture"` for the atlas).

**`role: "texture-atlas"` matters.** `src/main.js` picks the kart with
`assetIds.find((id) => assetInfo(id)?.role === 'kart')`, so exactly one entry
may carry `role: "kart"`. The atlas is never requested by name at runtime — it
only has to be **on disk next to the models** for `GLTFLoader` to find it — so
give it a role nothing asks for.

Optional, verified reachable, for the later IBL item only — do **not** wire it
in this pass (1.4 MB is most of a page budget):

- `env.sky` → `https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/equirectangular/venice_sunset_1k.hdr`,
  sha256 `0e72ed46b5316cb5fb67fc81ff85b024a09146fd89ef3811a8d2299647ada118`,
  CC0, Greg Zaal / Poly Haven, mirrored in the three.js repository. Replace the
  existing blocked `env.sky` entry with this one and mark it
  `"role": "reference"`.

### 2.4 Entries to remove

`model.toycar` (reference-only, superseded by a kart that is actually used),
`texture.asphalt`, `texture.concrete` and `kit.city` — the other three describe
a city that will no longer exist, and all three sit on hosts blocked here. Their
removal is what lets `CREDITS.md` regenerate as an honest list of what ships.

If a PBR mud pass is wanted later, add ambientCG `Ground037` and `Rock030`
entries marked `hostBlockedHere: true` — but note that §3.2's vertex-coloured
terrain is the intended look, not a stopgap, so this is genuinely optional.

### 2.5 Fetch procedure

```bash
npm run assets:fetch -- --record   # writes public/assets/ + hashes + CREDITS.md
npm run assets:verify
```

`public/assets/` is gitignored; nothing binary is committed. The hashes above
are already correct, so `assets:fetch` without `--record` must verify clean —
if it reports a mismatch, upstream moved and the URL pin needs revisiting.

---

## 3. Design

### 3.1 What does not change

- The 2048 × 2048 torus, the 3×3 render tiling, `ATMOSPHERE.MAX_VISIBLE`.
- Fixed-step physics, the event bus, discovery, cards, the résumé view.
- **Collision, discovery and surface sampling stay strictly 2-D.** The terrain
  gets height, but only the renderer knows about it (§3.2).
- `src/world`, `src/physics`, `src/content`, `src/core` stay free of `three`
  and the DOM. Every new module below in those directories is pure data + maths.

### 3.2 Terrain with height — visual only

New pure module `src/world/terrain.js`:

```js
export function heightAt(x, z)      // world units, 0..~26
export function slopeAt(x, z)       // { dx, dz } by central difference
```

- Seeded value noise, two octaves, on a lattice whose cell size **divides
  `WORLD.SIZE`** (e.g. 128 and 256) with the lattice index wrapped by
  `& WORLD.MASK`. That is what makes the field seamless across the torus seam;
  a test asserts `heightAt(x, z) === heightAt(x + WORLD.SIZE, z)`.
- Multiplied by a **corridor mask** that is exactly `0` within
  `ROAD_HALF + WALK` of any track centre line (§3.3) and inside every landmark
  paddock, ramping to `1` over the next ~70 units with a smoothstep. Flat where
  you drive, hills where you look.

The renderer lifts things onto it:

- `src/render/builders/terrain.js` builds one displaced, vertex-coloured
  heightfield for a single world tile and hands it to `tiledSlab` — one
  geometry, nine instances, one draw call, exactly as the ground slab is today.
  128 × 128 cells (16-unit) is the budget: ~33 k triangles, faceted (do not
  smooth the normals — the facets are the look).
- Scenery instances take `y = heightAt(x, z)`.
- `src/render/scene.js` sets the kart group's `y` from `heightAt` and its
  pitch/roll from `slopeAt`, damped; `src/render/camera.js` adds the same
  height so the chase camera does not clip through a rise.

Because physics never reads height, nothing about handling, collision or
discovery changes. Say so in a comment where the kart is lifted — the next
person will assume otherwise.

### 3.3 A track that snakes

New pure module `src/world/track.js`:

```js
export function trackOffsetAt(along)   // TRACK.WOBBLE * sin(2π * along / WORLD.BLOCK)
export function trackSlopeAt(along)    // its derivative, for orienting props and ribbon segments
export function distanceToTrack(x, z)  // torus-safe distance to the nearest track centre line
```

Why this shape: `sin(2π·along / BLOCK)` is **zero at every multiple of
`BLOCK / 2`**, so the track passes exactly through every junction (multiples of
`BLOCK`) _and_ through every block midpoint, where the boost pads sit. Nothing
about junction geometry or pad placement needs special-casing, the period
divides `WORLD.SIZE` so it is continuous across the seam, and `distanceToTrack`
stays an O(1) closed form that a unit test can pin — the same property that
made `surfaces.js` analytic in the first place.

`TRACK.WOBBLE = 58` in `src/config/world.js`, and:

```js
export const LOT_HALF = WORLD.BLOCK / 2 - WORLD.ROAD_HALF - WORLD.WALK - TRACK.WOBBLE;
```

so scenery can never be swallowed by a track that has swung toward it. Every
consumer of `LOT_HALF` picks this up for free; the lots get smaller, which
suits sparse rally scenery.

Everything that positions itself against a road must now offset by
`trackOffsetAt`: `src/world/street-furniture.js` (marker posts, parked
vehicles, boost pads are already on the zeros), `src/render/builders/ground.js`,
the road dressing, and the minimap.

**`initialState()` in `src/physics/kart.js` spawns at `x: WORLD.BLOCK, z: 120`
— on the old straight line, which is now a ditch. It must become
`x: wrap(WORLD.BLOCK + trackOffsetAt(120))`.** Assert it in a test:
`surfaceAt(spawn)` must be `TRACK`.

### 3.4 Surfaces

`SURFACE` in `src/config/world.js` keeps its shape (an enum the `GRIP` array is
indexed by) and gains one member. Rename in place, keeping the existing indices
so the two files cannot drift:

| index | was     | becomes   | grip | reads as                              |
| ----- | ------- | --------- | ---- | ------------------------------------- |
| 0     | `ROAD`  | `TRACK`   | 1.0  | packed dirt and gravel                |
| 1     | `WALK`  | `VERGE`   | 0.80 | grass shoulder — costs you a little   |
| 2     | `PLAZA` | `PADDOCK` | 0.95 | the packed service area at a landmark |
| 3     | `GRASS` | `FIELD`   | 0.55 | open meadow                           |
| 4     | `BOOST` | `BOOST`   | 1.0  | chevron ramp                          |
| 5     | —       | `MUD`     | 0.40 | a puddle: the new worst place to be   |

Puddles are their own pure module, `src/world/puddles.js`: a seeded list of
~40 discs (`{ x, z, radius }`), never placed within `ROAD_HALF + WALK + 8` of a
track centre line, sampled by `surfaceAt` with `wrapDistance`. One source of
truth — `src/world/surfaces.js` reads it for grip, and a renderer builder reads
the same list to lay the dark wet quads. A test asserts no puddle touches the
track (a puddle across the racing line would be a grip bug, not a feature).

### 3.5 Scenery instead of buildings

`city.buildings` becomes `city.scenery`, and each entry carries a `kind`:
`'rock' | 'barn' | 'bales' | 'stand' | 'landmark'`. The **object shape does not
change** — `{ x, z, halfWidth, halfDepth, base, height, color, … }` — so
`src/physics/collision.js` and the collider list work untouched. Rename the
field everywhere it is read (`src/render/builders/*`, `src/ui/minimap.js`,
`tests/city.test.js`); leaving rocks in an array called `buildings` is the kind
of drift this codebase's docs exist to prevent.

`src/world/city-blocks.js` (rename to `src/world/course-blocks.js`) picks a
**theme per block** from the seeded RNG, which is what makes the world worth
wandering:

- `forest` — dense tree stands, a few boulders, one log pile
- `quarry` — big rock outcrops, gravel scars, scattered rubble
- `farm` — a barn, hay bale stacks, a fenced paddock
- `meadow` — mostly open, a lone tree, two puddles

Colliders: rocks, barns and bale stacks are boxes and collide. Tree stands are
scatter props and do **not** collide — driving through a copse is fun, bouncing
off an invisible box around it is not.

Landmarks: keep the six `style` keys (`tower`, `campus`, `workshop`, `stadium`,
`cafe`, `post`) and restyle their box stacks in `src/world/landmarks.js` into
rally structures — a timber lookout tower, a lodge, a service garage with a
pit awning, a spectator arena with banked stands, a trailside café under a
canopy, a marshal post with a gantry. Same silhouette discipline: you navigate
by recognising a shape from three blocks away.

### 3.6 Look and light

`src/config/palette.js` is rewritten wholesale. Suggested anchors (tune by eye,
these are a starting point, not a spec):

```
SKY      TOP #2e6ea8   MIDDLE #79b6dd   HORIZON #dfe6d8
TERRAIN  TRACK #8a6a44  TRACK_WET #6f5334  MUD #4f3b26  PUDDLE #35301f
         VERGE #6f8f3f  FIELD #7ba244     FIELD_DARK #4c7233
         ROCK #8a8577   ROCK_DARK #615d53  SAND #c2a878
FOLIAGE  TRUNK #5b4029  DARK #2b5a2a  MID #3d7a33  LIGHT #6aa03f
PROPS    TIMBER #7b5230  HAY #d8b451  TYRE #2a2a2c  FLAG_RED #d94b3a
```

- `src/render/lighting.js`: warmer key (`0xffeecf`), sun lower in the sky, and
  the hemisphere bounce's ground colour set to mud rather than concrete. Rally
  scenery can carry a little more shadow contrast than the city could — the
  comment explaining why contrast was kept low needs updating, not deleting.
- `src/render/sky.js`: heavier, lower cloud deck; horizon colour must keep
  matching `scene.fog` exactly or the far hills end at a visible line.
- `src/render/builders/road-markings.js` → `track-dressing.js`: no lane paint,
  no zebras. Two tyre ruts down the track, a ragged mud edge where dirt meets
  verge, chevrons on the boost ramps, corner marker poles, and the
  start/finish line under the gantry. Keep the `GROUND_LAYER` ladder and add
  rungs for `RUT` and `PUDDLE` — coplanar layers z-fight the moment two share
  a rung.
- New `src/render/geometry/ribbon.js`: a strip built by sampling
  `trackOffsetAt` every 16 units along an axis (128 segments per line). Every
  ground layer that used to be one long quad becomes one ribbon.

### 3.7 Wiring the models in

- **Kart** (`src/render/builders/kart.js`): `useModel` already normalises an
  arbitrary glTF. Extend it to find `wheel-front-left`, `wheel-front-right`,
  `wheel-back-left`, `wheel-back-right` by name and spin those instead of the
  procedural wheels; if a model has no such nodes, keep the procedural wheels
  visible, as today. Watch the 90-line function ceiling — this wants to be a
  small helper, not a longer `useModel`.
- **Scenery** (`decoration-forest`, `decoration-tents`, `track-finish`): these
  arrive after the scene is built, so `src/render/stage.js` gains one verb,
  `useSceneryModel(id, model)`, delegating to the scenery builder, which
  swaps its procedural group for instances of the loaded geometry. `src/main.js`
  requests every manifest entry with `role: 'scenery'` alongside the kart.
  Extract the loaded mesh's geometry and instance it with `tiledInstances` —
  do not add nine cloned scene graphs per patch.
- Every one of these paths must no-op cleanly when the model is `null`. Test by
  deleting `public/assets/` and reloading: the site must look finished.

---

## 4. Work plan

Each phase is one commit that leaves `npm run check` green and the site
coherent. Do them in order — the order is chosen so the thing looks better at
every step rather than only at the end.

**Phase 0 — hygiene (do this first, separately).**
`npm run lint` and `npm run format:check` already fail on `main`:
`scripts/check-boundaries.mjs:34` uses `let failures` where `prefer-const`
wants `const`, and five files are unformatted (that script plus the four
`.claude/skills/harness-engineering/**` markdown files). Fix the script, run
`npm run format`, so that every later failure is one you caused.

**Phase 1 — repaint.** `src/config/palette.js`, `src/render/lighting.js`,
`src/render/sky.js`, `src/config/render.js` (fog tint). No data changes.
_Done when:_ the existing city renders in earth-and-moss under a low warm sun.

**Phase 2 — terrain.** `src/world/terrain.js` (+ `tests/terrain.test.js`),
`src/render/geometry/heightfield.js`, `src/render/builders/terrain.js`,
`src/render/scene.js`, `src/render/camera.js`.
_Done when:_ hills roll away either side of a still-straight road, the kart
sits on the ground and tips with it, and physics is provably untouched.

**Phase 3 — the winding track.** `src/config/world.js`, `src/world/track.js`
(+ `tests/track.test.js`), `src/world/surfaces.js`, `src/world/puddles.js`,
`src/world/street-furniture.js`, `src/physics/kart.js` (spawn),
`src/render/geometry/ribbon.js`, `src/render/builders/ground.js`,
`src/render/builders/track-dressing.js`, `tests/surfaces.test.js`.
_Done when:_ the track snakes, meets its junctions cleanly, mud slows you, and
no test asserts anything about a straight road any more.

**Phase 4 — scenery.** `src/world/course-blocks.js`, `src/world/city.js`,
`src/world/landmarks.js`, `src/render/builders/scenery.js` (replacing
`buildings.js`), `src/render/builders/trees.js`, `src/ui/minimap.js`,
`tests/city.test.js`.
_Done when:_ there is not a pastel tower left, the six landmarks read as rally
structures, and the block themes are visibly different from one another.

**Phase 5 — assets.** `assets/manifest.json`, `src/render/builders/kart.js`,
`src/render/builders/scenery.js`, `src/render/stage.js`, `src/main.js`,
`tests/manifest.test.js` if it enumerates ids.
_Done when:_ `npm run assets:fetch -- --record` pins clean, the Kenney truck
drives with spinning wheels, forest patches and tents appear — **and deleting
`public/assets/` still gives a finished-looking site.**

**Phase 6 — polish (stretch).** Mud spray from `kart.state.slide` and on
`MUD`/`VERGE`, rut decals behind the rear wheels (instanced ring buffer, no
per-frame allocation — roadmap item 5), puddle sheen, a small speed-based FOV
kick, and the user-facing copy in `index.html`, `src/ui/overlays.js` and
`README.md`, which still says "city".

Finally: update `docs/ARCHITECTURE.md` (the module table, the wrapping-world
section, and a new note that height is renderer-only) and `docs/ROADMAP.md`
(items 1, 2, 4 and 6 are answered or replaced by this work).

---

## 5. Tests

New:

- `tests/track.test.js` — offset is 0 at every junction and every block
  midpoint; |offset| ≤ `TRACK.WOBBLE`; continuous across the seam;
  `distanceToTrack` agrees with a brute-force sampled minimum.
- `tests/terrain.test.js` — deterministic; wraps in both axes; exactly 0 on the
  track corridor and inside every landmark paddock; bounded; no cliff between
  adjacent samples.
- `tests/puddles.test.js` — deterministic; none within
  `ROAD_HALF + WALK + 8` of a track line.

Changed:

- `tests/surfaces.test.js` — the new enum, the wobble, mud.
- `tests/city.test.js` — "never puts scenery on a road" becomes "every ground
  collider clears `distanceToTrack` by at least `ROAD_HALF`"; landmarks stand
  on `PADDOCK`; spawn point is on `TRACK`.
- `e2e/smoke.spec.js` — only if a copy assertion breaks. Do not weaken it.

Unchanged and must stay passing untouched: `tests/content.test.js`,
`tests/collision.test.js`, `tests/kart.test.js`, `tests/torus.test.js`.

---

## 6. Traps specific to this work

- **The colour trap** (`src/render/materials.js`). Rocks and bales want a
  per-instance tint: `instancedTinted()` + `setColorAt`, and **no**
  `vertexColors`. The terrain and trees want `vertexColoured()` because their
  colour is baked into a `color` attribute. Mixing the two renders black,
  silently.
- **`mergeParts`, never `mergeGeometries`** — a mixed indexed/non-indexed batch
  returns `null` and fails much later.
- **Ground layer order** — the verge ribbon is wider than the track ribbon it
  flanks, so it must sit _below_ it. Same rule as the old pavement.
- **Boost pads sit at every block midpoint.** Any test that drives in a
  straight line for more than a couple of seconds crosses one and gets a
  speed it did not expect.
- **File ceilings.** 260 lines, 90 lines per function. `ground.js` and the
  scenery builder will both want to exceed them: split (`ribbon.js`,
  `heightfield.js`, `track-dressing.js` exist for this reason), never raise
  the limit.
- **Boundaries.** `terrain.js`, `track.js`, `puddles.js` live under `src/world`
  and may not import `three` or reach into `src/render`. `npm run
check:boundaries` enforces it.
- **Draw distance.** Do not raise `ATMOSPHERE.FOG_FAR` past `MAX_VISIBLE`; the
  hills make the temptation stronger, and the 3×3 tiling is what pays for it.
- **Performance.** The heightfield adds ~33 k triangles inside one instanced
  geometry. Check `window.__kart.session.stage.diagnostics` before and after —
  draw calls should not climb by more than a handful, and the quality ladder
  should still settle on `high` on a normal machine.

---

## 7. Review checklist

For the reviewing agent, in rough order of what would hurt most:

1. `npm run check` green from a clean clone, **and** green with
   `public/assets/` deleted. The site must look finished with no assets.
2. No `three` import and no DOM reference under `src/world`, `src/physics`,
   `src/content`, `src/core`.
3. Physics and collision remain 2-D: terrain height is applied in
   `src/render` only, and no gameplay value is derived from it.
4. Every coordinate comparison goes through `wrapDelta` / `wrapDistance`.
   Anything that subtracts two world coordinates directly is a bug across the
   seam.
5. The kart spawns on the track, not beside it; the six landmarks each stand on
   `PADDOCK` and are reachable; every discovery ring is drivable-into.
6. Nothing personal outside `src/content/resume.js`; `resume.js` and
   `schema.js` unmodified.
7. Manifest: every entry licensed, attributed, hash-pinned, `required: false`,
   exactly one `role: "kart"`, and the atlas landing beside the models.
   `CREDITS.md` regenerated, not hand-edited.
8. Determinism: two `createCity()` calls byte-identical; a different seed
   differs.
9. Instanced meshes follow the colour trap rules; no mesh renders black.
10. File and function ceilings respected without raising a limit; each new file
    has one job and a comment saying what and why.
