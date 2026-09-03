# Roadmap

Remaining work, ordered by value per unit of effort. Each item names the files
it touches so it can be picked up cold.

## Ready to pick up

### 1. Fetch the blocked assets and pin their hashes

**Files:** `assets/manifest.json` (hashes only)
**Effort:** minutes, on a machine with network access

Four manifest entries could not be fetched in the environment this was built
in — kenney.nl, ambientcg.com and polyhaven.com are blocked there by egress
policy. Run `npm run assets:fetch -- --record` somewhere with access and commit
the resulting `sha256` values. Everything downstream already works.

### 2. Real ground textures

**Files:** `src/render/builders/ground.js`, `src/render/materials.js`
**Depends on:** item 1 (`texture.asphalt`, `texture.concrete`)

Apply the fetched asphalt and concrete maps to the road and pavement meshes
with `RepeatWrapping` and a world-scale UV repeat. Keep the flat colour as the
fallback when the texture is absent. The painted markings stay geometry — they
are sharper that way at every distance.

### 3. A purpose-built kart model

**Files:** `assets/manifest.json`, `src/render/builders/kart.js`
**Effort:** an afternoon, mostly sourcing

Add a CC0 kart glTF with `"role": "kart"` and `useModel` picks it up
automatically — it already measures and normalises an arbitrary model onto the
kart's footprint. The current `model.toycar` entry is deliberately roled
`reference`: it is a car under a dust sheet and reads worse than the procedural
kart. Wheels will need naming so `update` can spin them.

### 4. Modular building meshes

**Files:** `src/render/builders/buildings.js`, `src/world/city-blocks.js`
**Depends on:** item 1 (`kit.city`)

Replace the instanced boxes with a kit of modular meshes. Keep the instancing
and the 3×3 tiling; swap the geometry and choose a variant per building from
the seeded RNG so the layout stays deterministic. The facade shader becomes
unnecessary for kitted buildings but must stay for any that remain boxes.

### 5. Drift particles and skid marks

**Files:** new `src/render/builders/effects.js`, `src/render/scene.js`
**Effort:** a day

`kart.state.slide` already carries the information. Emit sparks above a slide
threshold and lay decals on the ground behind the rear wheels. Both want an
instanced pool with a ring buffer, not per-frame allocation.

### 6. Image-based lighting from an HDRI

**Files:** `src/render/lighting.js`, `src/render/sky.js`
**Depends on:** item 1 (`env.sky`)

Load the HDRI with `RGBELoader`, set it as the scene environment, and keep the
gradient dome as the fallback. Expect to re-tune `SUN.AMBIENT_INTENSITY` down:
an environment map already supplies the ambient the hemisphere light is
currently faking.

## Known limitations

- **Draw distance is capped at half the world size** (1024 units) because the
  city is tiled 3×3. Seeing further means tiling 5×5, which quadruples instance
  counts. Probably not worth it — fog closes the picture well before then.
- **Shadows only cover ±420 units around the kart.** Beyond that the shadow
  frustum ends. Distant shadows are lost in fog anyway; raising
  `SUN.SHADOW_RADIUS` costs shadow-map resolution everywhere.
- **The `three` chunk is 159 KB gzipped.** That is most of the page weight. Not
  much to be done short of hand-rolling WebGL, which would cost far more than
  it saves.
- **No audio assets.** Everything is synthesised. Real engine samples would
  sound better; they would also be the first thing to make the site heavy.

## Deliberately not doing

- **Multiplayer or leaderboards.** This is a résumé.
- **A physics engine.** The arcade model is the right feel and is 140 lines.
- **Cross-browser WebGPU.** WebGL2 is universal and fast enough here.
