# Vegetation: real trees and a real grass carpet

A plan for replacing the lollipop trees with a reusable, data-driven foliage
library, and for putting actual grass on the ground the player drives over.

Read `CLAUDE.md` and `docs/ARCHITECTURE.md` first. This plan assumes both.

## What is there now

- **Trees** (`src/render/builders/trees.js`, 187 lines): three variants, each a
  6-sided cylinder trunk plus three or four flat-shaded icosahedron blobs,
  merged and instanced through `tiledInstances`. No rotation per instance, so a
  stand is the same silhouette repeated. A downloaded model can replace one
  variant, or a forest patch can replace the copses.
- **Grass**: none. `TERRAIN.VERGE` is a flat coloured ribbon, `TERRAIN.FIELD`
  is vertex colour on the heightfield, and an optional recentred grass
  photograph (`builders/terrain.js` → `useTexture`) adds contrast to it. From a
  driver's eye height the ground is a smooth coloured sheet.

## Goal

1. Trees with a readable silhouette and near-field detail — a trunk that
   branches, a canopy with depth, four species rather than three lumps.
2. A grass carpet of real geometry around the kart, dense enough to read as
   blades at driving speed, that costs nothing where the player is not.
3. **Both built from one reusable parts library**, so a new species or a new
   ground cover is a data entry plus a call, not a new builder.

## Non-goals

- No new downloaded assets. The existing `useModel` upgrade path stays exactly
  as it is (rule 4: assets are an upgrade, never a dependency).
- No gameplay change. Grass and trees are cosmetic; nothing here may reach
  `src/physics`, and nothing here may derive a gameplay value from terrain
  height.
- No change to `src/world`, `src/physics`, `src/content` or `src/core`. Every
  file this plan adds lives under `src/render` or `src/config`.

## The constraints that shape every decision below

These are the repo's, not this plan's. They rule out most of the obvious
approaches, which is why they are listed before the design.

1. **The world is built once and tiled 3×3.** `tiledInstances` bakes nine
   copies of every item at build time. Anything scattered across the whole
   2048×2048 stage costs nine times its instance count, forever.
2. **The kart never moves.** It sits at the origin and `worldGroup` slides
   under it. Anything that wants to follow the camera can do so by living
   inside `worldGroup` and holding true world coordinates.
3. **Lambert only.** No PBR, no custom `ShaderMaterial`. See _Why Lambert and
   not PBR_ in `docs/ARCHITECTURE.md`.
4. **The colour trap** (`src/render/materials.js`): a material is either
   per-instance tinted _or_ vertex-coloured, never both, and `vertexColoured()`
   is a shared cache — pass a distinct option (as `builders/terrain.js` passes
   `{ name: 'terrain' }`) or your texture lands on someone else's mesh.
5. **`mergeParts` normalises to non-indexed.** Mixing `CylinderGeometry` and
   `PlaneGeometry` parts is fine; the merged result has no index buffer.
6. **The ground you can see is `terrain-surface.js`, not `world/terrain.js`.**
   Everything seated on the ground goes through `surfaceHeightAt`, or it floats
   over and sinks into the hillside the player is actually looking at.
7. **The track snakes.** Nothing may be positioned against a grid line. Grass
   placement decides where it is by asking `city.surfaceAt`, which already
   knows where the track went.
8. **Size limits.** 260 lines per file, 90 per function, enforced by ESLint.
   The file sizes below are budgets, not estimates.

## Architecture

One library of parts, two consumers.

```
src/config/vegetation.js          species table + grass tuning (pure data)
        │
src/render/foliage/               THE REUSABLE LIBRARY
        ├── limb.js               tapered, bent trunk/branch segments
        ├── canopy.js             leaf shells and alpha leaf cards
        ├── tuft.js               a clump of curved grass blades
        ├── tree.js               a species descriptor -> { solid, leaves }
        └── placement.js          deterministic scatter maths (NO three import)
        │
src/render/textures/leaf.js       drawn leaf-cluster sprite with alpha
src/render/terrain-tint.js        ground colour by height+slope, shared
        │
        ├──> src/render/builders/trees.js    placement + instancing + useModel
        └──> src/render/builders/grass.js    the follow field
```

`foliage/` holds no placement policy and no scene graph. It takes numbers and
an RNG and returns `BufferGeometry`. That is what makes it reusable: the grass
builder and the tree builder both draw from it, and a future bush, fern or
hedgerow is a descriptor plus a call.

---

## Phase 1 — `src/config/vegetation.js`

**New file. Budget: ~120 lines. Pure data, no logic, no `three` import.**

Colours come from `src/config/palette.js` (`FOLIAGE`, `TERRAIN`). Config
importing config is fine; config importing anything else is not.

```js
export const SPECIES = Object.freeze([
  { id: 'pine',   trunk: {...}, canopy: { kind: 'conifer',   ... } },
  { id: 'oak',    trunk: {...}, canopy: { kind: 'broadleaf', ... } },
  { id: 'birch',  trunk: {...}, canopy: { kind: 'broadleaf', ... } },
  { id: 'spruce', trunk: {...}, canopy: { kind: 'conifer',   ... } },
]);
```

Each descriptor carries: trunk height fraction, base/tip radius, sides, lean
and bend; branch count, spread and pitch; canopy shell count, radii, vertical
placement, and how many leaf cards ride on it; and the three canopy tones plus
the bark tone.

`GRASS` carries the numbers Phase 5 needs, with these fixed by the constraints:

- `CELL: 64` — **must divide `WORLD.SIZE` exactly** (2048 / 64 = 32). A cell
  size that does not divide the world puts a visible discontinuity along the
  seam, the same failure `world/terrain.js` avoids with its lattice.
- `WINDOW: { low: 5, medium: 9, high: 11 }` — cells across, always odd so the
  kart's own cell is the centre one. 11 cells is ±352 units.
- `TUFTS_PER_CELL: 64`, `BLADES_PER_TUFT: 5`.
- `HEIGHT: { field: 3.4, verge: 1.6 }` — the verge is mown short by tyres, and
  saying so with blade height is what makes the ribbon read as a shoulder
  rather than as paint.

Capacity is `max(WINDOW)² × TUFTS_PER_CELL` = 7744 instances. Sized once at
build time for the highest tier; lower tiers zero-scale the surplus rather than
rebuild.

## Phase 2 — `src/render/foliage/limb.js`

**New file. Budget: ~90 lines.**

```js
export function taperedLimb({ length, baseRadius, tipRadius, sides, segments, bend, rng })
```

Returns a `BufferGeometry` running from y = 0 up to y = `length`, origin at the
base. `segments` rings, each ring displaced laterally along a quadratic so the
limb leans and bends; a small seeded jitter per ring so no two limbs of a
species are identical.

Build it by hand from `CylinderGeometry` ring displacement, not by stacking
cylinders — a stack shows a seam at every joint under flat shading.

Also exports `orientLimb(geometry, { pitch, yaw })` so `tree.js` can plant a
branch on a trunk without repeating the trig.

## Phase 3 — `src/render/foliage/canopy.js` and `src/render/textures/leaf.js`

**Two new files. Budgets: ~120 and ~90 lines.**

`canopy.js` exports two ways of making foliage, and a species uses both:

- `leafShell({ radius, detail, squash, tone, rng })` — the existing icosahedron
  blob, kept because it is what gives a canopy its silhouette and its volume in
  fog. Vertex-coloured with `tone`.
- `leafCards({ count, radius, height, size, tones, rng })` — the near-field
  detail. Each card is two crossed quads on an ellipsoid shell, tilted to face
  outward from the canopy centre so the cluster does not go edge-on and vanish.

**Vertex colours on the cards carry shading only, not leaf colour.** The leaf
texture carries the colour, and `map × vertexColor` multiplies, so the cards
are painted from near-white at the crown to about 0.55 grey at the canopy's
underside. That gradient is the whole reason a card cluster reads as depth
rather than as wallpaper; it is the same trick the existing tree's DARK/MID/
LIGHT tones use, applied per vertex instead of per blob.

`textures/leaf.js` draws the sprite: roughly forty small leaf shapes in the
species' greens on a **transparent** canvas, seeded so two runs draw the same
sheet. Return a `CanvasTexture` with `colorSpace = SRGBColorSpace`.

Do **not** put this through `recentreOnWhite`. That helper exists because the
bark and foliage textures multiply a flat tint and must average to 1.0; this
one carries its own colour and its own alpha, and recentring would flatten both.
Say so in the file's docblock — it is exactly the kind of thing the next person
"fixes".

The card material is alpha-tested, never transparent:
`{ alphaTest: 0.45, transparent: false, side: DoubleSide, vertexColors: true, map }`.
`transparent: true` would need per-instance sorting, which an `InstancedMesh`
cannot do. three copies `map` and `alphaTest` onto the depth material, so
alpha-tested shadows work without a `customDepthMaterial`.

## Phase 4 — `src/render/foliage/tree.js` and the rewritten builder

**New file `foliage/tree.js`, budget ~130 lines. `builders/trees.js` shrinks.**

```js
export function buildTreeGeometry(species, rng)  // -> { solid, leaves }
```

Two merged geometries per species, because they need different materials:

| Geometry | Contents                     | Material                                                           |
| -------- | ---------------------------- | ------------------------------------------------------------------ |
| `solid`  | trunk, branches, leaf shells | `vertexColoured({ name: 'tree-solid' })` + bark map                |
| `leaves` | leaf cards                   | `vertexColoured({ name: 'tree-leaf', ... })` + leaf map, alphaTest |

Both are authored at `REFERENCE_HEIGHT = 50` and scaled per instance, exactly
as today. Four species × two meshes = eight draw calls for every tree on the
stage.

Reuse `createBarkTexture()` from `textures/foliage.js` for the trunk — it
already exists, it is already recentred on white, and it is already correct for
a surface that carries its colour in vertex colours.

`builders/trees.js` keeps only placement, instancing and the model swap:

- **Keep the `useModel` contract byte for byte.** `TREE_MODELS` maps a
  downloaded model to a species index; model N hides species N's two meshes and
  nothing else, so one asset arriving does not take the others down. The
  forest-patch path (`kit.rally.forest` → `copse-trees`) is unchanged.
- **Add per-instance `rotationY` and ±12% uniform scale jitter.** This is the
  cheapest realism in the whole plan: the trees are already instanced, and
  identical silhouettes in a row is most of what makes the current stand read
  as procedural. Scale stays uniform — a tree squashed on one axis stops being
  a tree.
- Species assignment stays `index % SPECIES.length`, so a model still replaces
  exactly its own share.
- `seatOnGround` and `receiveShadow = false` are unchanged (foliage
  self-shadowing reads as dirt, not depth — the existing comment is right).

## Phase 5 — `src/render/builders/grass.js`, the follow field

**New files: `foliage/tuft.js` (~90 lines), `foliage/placement.js` (~90
lines), `builders/grass.js` (~180 lines).**

### Why a follow field and not tiling

Grass over the whole stage at a density that reads is on the order of a million
tufts, times nine tiles. Grass is also only legible for a couple of hundred
units. So: one `InstancedMesh` of fixed capacity holding a window of cells
around the kart, recycled as the kart drives.

It goes **inside `worldGroup`**. That is the trick that makes this cheap:
`worldGroup` already slides by `-kartState.x, -kartState.z` every frame, so the
instances hold true world coordinates and never need rewriting for camera
motion — only for cells entering and leaving the window.

### `foliage/tuft.js`

```js
export function grassTuft({ blades, height, width, curve, rng })
```

Each blade is a three-segment tapered strip — six triangles — swept along a
quadratic so it arcs over, rotated to a different yaw and given a different
height. Vertex-coloured dark at the base, light at the tip: that gradient is
what gives a carpet of blades depth under a lighting model with no specular.

Roughly 30 triangles per tuft, so a full window is about 230k triangles — the
same order as the terrain mesh itself, in one draw call.

**Geometry blades, not alpha cards.** Cards would mean overdraw and an
alpha-test pass over a full screen of ground, for a look that is softer than
this stage wants. Blades also need no texture at all, which keeps rule 4 free.

### `foliage/placement.js` — no `three` import, therefore testable

```js
export const cellOf = (coord, cell) => Math.floor(coord / cell);
export function windowCells(centreCellX, centreCellZ, span)   // -> iterable
export function tuftsInCell(cellX, cellZ, count, cell)        // -> [{x, z, yaw, scale}]
```

`tuftsInCell` hashes the **wrapped** cell index (`cellX & (SIZE/CELL - 1)`) into
a seeded RNG from `src/core/rng.js`, so:

- a cell looks identical every time you drive back to it — no swimming, no
  reshuffling;
- cell `c` and cell `c + SIZE/CELL` produce the same layout, which is what makes
  the seam invisible;
- and the whole thing is a pure function two unit tests can pin.

Positions returned are **unwrapped** — `cellX * CELL + offset`, negative or past
`WORLD.SIZE` at the edges — because that is where they must be drawn relative
to the kart. Only the hash and the surface lookup use the wrapped value.

### `builders/grass.js`

```js
export function buildGrass(city)  // -> { group, update(kartState), setQuality(tier) }
```

Build: one `InstancedMesh` at max capacity, `castShadow = false`,
`receiveShadow = true`, `frustumCulled = false` (the mesh straddles the camera,
as `tiledInstances` explains).

`update(kartState)`:

1. Compute the kart's cell. If it has not changed, return — this is a no-op on
   the overwhelming majority of frames.
2. Otherwise rewrite only the instances belonging to cells that entered the
   window. Moving one cell rewrites at most `span × TUFTS_PER_CELL` = 704
   matrices; the other ~7000 are untouched.
3. For each tuft: ask `city.surfaceAt(wrappedX, wrappedZ)`.
   - `TRACK`, `BOOST`, `PADDOCK`, `MUD` → scale 0. Grass does not grow on the
     racing line, in a puddle, or in a service area. Keeping the instance and
     zeroing it avoids compacting the buffer.
   - `VERGE` → `HEIGHT.verge`. `FIELD` → `HEIGHT.field`.
4. Seat at `surfaceHeightAt(x, z)` — the drawn surface, not the analytic field.
5. Tint from the shared terrain tint (below), so grass on the dry tops comes
   out dry and grass on a stony face thins out rather than growing through the
   rock.
6. Fade `scale` to zero across the outermost ring of cells, so tufts grow in
   rather than popping in at full size.

`setQuality(tier)` moves the window span between `GRASS.WINDOW` entries and
zero-scales what falls outside it.

### `src/render/terrain-tint.js`

Move `tintAt`, `ROCK_SLOPE`, `STEEP_SLOPE`, `DRY_FROM` and the `Color`
constants out of `builders/terrain.js` into their own module, exporting
`groundTintAt(x, y, z)`. `builders/terrain.js` imports it (and drops ~45 lines,
which it needs — it is at 160), and `builders/grass.js` imports it too. One
definition of what colour the ground is, read by both the thing that draws the
ground and the thing that grows on it.

Note that `groundTintAt` returns a shared scratch `Color`; copy before holding
it. Keep that comment.

## Phase 5b — bushes (optional, only if Phase 5 lands clean)

A second, much sparser instanced mesh in the same window: `leafShell` clusters
at ~1 per cell, `FIELD` only (never `VERGE` — a bush on the shoulder hides the
racing line, and this one is not a collider so you would drive through it).
Same recycle path, same seating. If the window bookkeeping in Phase 5 turns out
to be at all delicate, skip this rather than double it.

## Phase 6 — wiring

`src/render/scene.js` only:

```js
const grass = buildGrass(city);
worldGroup.add(..., grass.group);
// in update(), after worldGroup.position.set(...):
grass.update(kartState);
// in setQuality(tier):
grass.setQuality(tier);
```

`stage.js` needs no change — `setQuality` already flows through it. `scene.js`
is at 119 lines and has room.

## Phase 7 — wind (optional, do last or not at all)

A `material.onBeforeCompile` patch adding a vertex displacement from
`uTime` and the instance's world position, applied to the grass and the leaf
cards. It is the only three-idiomatic way to animate this without abandoning
Lambert's fog and shadow chunks.

If you do it: set `material.customProgramCacheKey` so the patched material does
not collide with the cache, drive `uTime` from `scene.update`'s `dt`, and turn
it off on the `low` tier. If the diff starts growing past a few dozen lines,
stop — a still stage is much better than a broken one, and everything above is
worth more than this is.

## Phase 8 — tests

New `tests/vegetation.test.js` (node environment; `three` runs fine in Node,
`document` does not — so this file must not import `textures/leaf.js` or
anything that reaches it).

Pin the claims that would otherwise fail silently:

1. `GRASS.CELL` divides `WORLD.SIZE`; every `WINDOW` span is odd.
2. `tuftsInCell` is deterministic: two calls for the same cell give identical
   output.
3. Seam: cell `c` and cell `c + WORLD.SIZE / CELL` give the same layout modulo
   the world size. This is the test that catches a wrapping mistake that is
   otherwise only visible by driving to one specific line on the map.
4. Every tuft a window produces over a sample of kart positions, when its
   position is wrapped and passed to `createCity().surfaceAt`, is either
   `FIELD` or `VERGE`, or has been zero-scaled. **Nothing grows on the track.**
5. `buildTreeGeometry` for every species returns non-empty `solid` and `leaves`
   geometries with `position`, `normal` and `color` attributes, `leaves` also
   with `uv`, and a combined bounding box whose height is within a few percent
   of `REFERENCE_HEIGHT` and whose base sits at y ≈ 0.
6. Every species descriptor has the keys `buildTreeGeometry` reads. A missing
   key currently produces `NaN` vertices, which render as nothing at all.

Extend `tests/city.test.js` only if something there stops holding. Nothing in
this plan changes `src/world`, so nothing there should.

`e2e/smoke.spec.js` needs no new test — it already asserts the scene draws and
that driving works, which is what would break if the grass update threw.

## Order of work

Phases are in dependency order, and each one is committable on its own:

1. Config (Phase 1) — nothing depends on nothing.
2. `limb.js`, `canopy.js`, `leaf.js` (Phases 2–3) — the library.
3. `tree.js` + `builders/trees.js` (Phase 4) — **first visible result. Stop and
   look at it.**
4. `terrain-tint.js` extraction (part of Phase 5) — pure refactor, `npm run check`
   must be green before and after with no other change in the commit.
5. `tuft.js`, `placement.js`, `builders/grass.js`, wiring (Phases 5–6).
6. Tests (Phase 8) alongside, not after.
7. Bushes and wind (5b, 7) only if the above is clean.

## Definition of done

- `npm run check` green. That is lint, format, boundaries, assets, unit tests
  and build.
- `npm run e2e` green.
- No file over 260 lines, no function over 90.
- `npm run check:boundaries` still passes, which it will, because nothing here
  touches the four guarded directories.
- A fresh clone with **no** `assets:fetch` run looks finished — check this by
  moving `public/assets` aside and loading the page.
- The `useModel` upgrade path still works with assets present.
- Frame budget: the `high` tier still holds its tier on the machine you are
  testing on. `stage.diagnostics` reports the tier and the draw count; the draw
  count should rise by about ten, not by a hundred.

## Traps specific to this work

- **`vertexColoured()` is a cache.** Two calls with the same options return the
  same material object. The tree leaf material, the tree solid material and the
  grass material must each pass a distinct `name`, or one of them ends up
  wearing another's texture. `builders/terrain.js` already learned this.
- **Zero-scaled instances still cost a matrix.** They do not cost a fragment,
  which is the point, but do not use zero scale as a substitute for sizing the
  buffer sensibly.
- **`surfaceAt` takes wrapped coordinates.** The window produces unwrapped
  ones. Wrap with `wrap` from `src/core/torus.js`; do not use `%`, which gives
  a negative result for a negative input.
- **Never subtract two world coordinates.** The window's edge test and the
  fade are both distance measurements. `wrapDelta` / `wrapDistance`.
- **Grass must not cast shadows.** Seven thousand alpha-free instances through
  the shadow pass at `SHADOW_RADIUS` 420 is a tier drop on its own.
- **The leaf texture needs a `document`.** It is built on first use, like
  `textures/foliage.js`'s. Keep it lazy, and keep it out of anything a Node
  test imports.
