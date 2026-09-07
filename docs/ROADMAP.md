# Roadmap

Remaining work, ordered by value per unit of effort. Each item names the files
it touches so it can be picked up cold.

## Done

The rally rework (`docs/RALLY-PLAN.md`) answered or replaced four of the items
that used to be at the top of this list:

- **Fetch the blocked assets.** Replaced. Every blocked host was dropped in
  favour of `raw.githubusercontent.com`, which is reachable, and all six
  manifest entries are now fetched and hash-pinned against a specific upstream
  commit. Nothing in the manifest is marked `hostBlockedHere` any more.
- **Real ground textures.** Replaced. The ground is a vertex-coloured
  heightfield plus flat ribbons, which is the intended look rather than a
  stopgap; a PBR mud pass would fight it. If someone wants one anyway, add
  ambientCG entries and expect to re-tune the whole lighting rig.
- **A purpose-built kart model.** Done. Kenney's rally truck is wired in with
  `role: "kart"`, and `src/render/builders/kart.js` now finds
  `wheel-front-left` and friends by name and spins those.
- **Modular building meshes.** Done. Each farm block holds a farmhouse and an
  outbuilding, upgraded to Quaternius LowPoly Buildings through
  `stage.useSceneryModel(id, model)`. The blocks also hold rocks, bale stacks
  and spectator stands.
- **Move the stage onto Quaternius / Kenney art.** Done — see
  `docs/QUATERNIUS-KIT-PLAN.md`. Trees, rocks and buildings are Quaternius
  (Stylized Nature MegaKit, LowPoly Buildings); the player kart and all traffic
  are Kenney (Car Kit); everything is mirrored web-optimised at
  `github.com/Samjoel3101/3d-assets` and pinned to a commit. The ground,
  track ribbon and sky stay procedural by design.

The one piece of the plan's polish phase that landed is the speed-based field
of view kick in `src/render/camera.js`. The rest of it is item 1 below.

## Ready to pick up

### 1. Mud spray, ruts and puddle sheen

**Files:** new `src/render/builders/effects.js`, `src/render/scene.js`
**Effort:** a day

Phase 6 of the rally plan, left undone. `kart.state.slide` and
`kart.state.surface` already carry everything needed: throw spray above a slide
threshold and whenever the surface is `MUD` or `VERGE`, and lay rut decals on
the ground behind the rear wheels. Both want an instanced pool with a ring
buffer, not per-frame allocation. The decals have to follow the heightfield —
see how `src/render/builders/puddles.js` lifts its discs.

### 2. Image-based lighting from an HDRI

**Files:** `src/render/lighting.js`, `src/render/sky.js`
**Depends on:** the pinned `env.sky` entry, which is fetched but not wired in

Load the HDRI with `RGBELoader`, set it as the scene environment, and keep the
gradient dome as the fallback. It is 1.4 MB — most of a page budget — so it must
be lazy and must never block the first frame. Expect to re-tune
`SUN.AMBIENT_INTENSITY` down: an environment map already supplies the ambient
the hemisphere light is currently faking.

### 3. Ground detail, and more of the nature kit

**Files:** new `src/render/builders/ground-detail.js`, `assets/manifest.json`
**Effort:** half a day

The mirror carries 68 Quaternius nature models; the stage uses six. Ferns,
grass tufts, mushrooms and pebbles (`Fern_1`, `Grass_Common_Tall`,
`Mushroom_Common`, `Pebble_Round_*` — all already in the mirror) scattered
along the verge with a seeded RNG would fill the middle distance. Pure
addition, instanced, seated through `terrain-surface.js`. Also unused:
`DeadTree_*` and `TwistedTree_*` for roadside character, and the Car Kit
`cone`/`debris-*` for the boost-ramp approaches.

### 5. A tile-based track family

**Files:** `src/world/track.js`, `src/config/world.js`, a new track builder

The Kenney 3D Road Tiles are mirrored (`kenney-3d-road-tiles/`) but not wired:
the track is a continuous procedural ribbon, and discrete straight/curve tiles
need a grid the wobble does not have. A real tile track means a second track
model behind the same interface `world/track.js` exposes — `trackOffsetAt`,
`trackSlopeAt` — keeping the torus-seam and boost-pad invariants
`tests/track.test.js` pins. Big job; the ribbon looks right as it is.

### 4. A second track family

**Files:** `src/config/world.js`, `src/world/track.js`

The wobble is one sine with a period of one block. A second harmonic, or a
different amplitude per line, would make the stages less uniform. The
constraint is not negotiable: whatever the shape, it must be zero at every
multiple of `BLOCK / 2` and have a period that divides `WORLD.SIZE`, or
junctions, boost pads and the seam all break at once. `tests/track.test.js`
pins exactly that.

## Known limitations

- **Draw distance is capped at half the world size** (1024 units) because the
  stage is tiled 3×3. Seeing further means tiling 5×5, which quadruples
  instance counts. Probably not worth it — fog closes the picture well before
  then.
- **Terrain height is cosmetic.** The kart is lifted and tilted onto the
  heightfield but the physics is two-dimensional, so a hill neither slows you
  down nor speeds you up. Changing that means a gravity model and a
  three-dimensional collision pass, which is a different game.
- **Shadows only cover ±420 units around the kart.** Beyond that the shadow
  frustum ends. Distant shadows are lost in fog anyway; raising
  `SUN.SHADOW_RADIUS` costs shadow-map resolution everywhere.
- **The `three` chunk is 166 KB gzipped** (159 KB before the Meshopt decoder
  the mirrored kits need). That is most of the page weight. Not
  much to be done short of hand-rolling WebGL, which would cost far more than
  it saves.
- **No audio assets.** Everything is synthesised. Real engine samples would
  sound better; they would also be the first thing to make the site heavy.

## Deliberately not doing

- **Multiplayer or leaderboards.** This is a résumé.
- **A physics engine.** The arcade model is the right feel and is 140 lines.
- **Cross-browser WebGPU.** WebGL2 is universal and fast enough here.
