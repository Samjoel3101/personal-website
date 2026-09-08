# Architecture

## The one idea

The world does not know a renderer exists.

`src/world`, `src/core` and `src/config` are plain JavaScript that runs in
Node. They describe a valley — where the ground is, what colour it is, and what
grows on it — and hold no reference to a canvas, a DOM node or a GPU.
`src/render` reads that description and draws it. `src/app/session.js` is the
only module that imports from both.

That boundary is load-bearing. It is why the entire landscape can be generated
and asserted on in a two-second unit test with no browser, why the planting can
be rebalanced without opening a shader, and why the interesting failure modes —
a tree in a lake, a pond on a hillside, a forest that never thins — are caught
by `npm test` rather than by looking at a screenshot.

## Data flow

```
config/world.js  ─┐
config/flora.js  ─┤   world/path.js  ── the trail: one centre line, a function of z
config/palette.js ┴─> world/biome.js ── journeyAt(x, z): 0 forest … 1 desert
                             │                    │
                             ├─> world/terrain.js ┤──> height field + sampled grid
                             ├─> world/water.js   │──> pools, basins, banks
                             ├─> world/ground.js  │──> the colour of a point
                             └─> world/scatter.js ┘──> what grows where
                                        │
                          world/valley.js  (plain data: grid, canopy, cover, pools)
                                        │
                    ┌───────────────────┴───────────────────┐
              render/scene.js                          ui/hud.js
        terrain mesh · water · flora                (via app/session.js)
              render/camera.js ── walks the trail
```

`createValley()` returns plain objects and functions. The renderer turns them
into geometry. Nothing goes the other way.

## The journey is one number

`journeyAt(x, z)` is 0 in the deep forest and 1 in the deep desert.
`biomeWeights(u)` turns it into four weights that sum to one, of which at most
two are ever non-zero, and **every** difference between the two ends of the
valley is a blend keyed by those weights:

- the amplitude of the hills and of the dune ridges (`config/world.js`,
  `TERRAIN.HILLS` and `TERRAIN.DUNES`);
- the colour of the ground and of the haze (`config/palette.js`);
- the weight of every species in the planting (`config/flora.js`).

Adding a new thing that changes along the valley means adding a per-biome table
and blending it. It does not mean adding a threshold.

The boundary is warped by a noise field in x, so the forest reaches further
down one side of the valley than the other. The warp is a function of x alone,
which keeps the journey monotonic along z from wherever you stand — a property
a test pins.

## The trail

There is one path, it runs the length of the valley, and five separate parts of
the project read it:

- `world/terrain.js` levels the ground **across** it — taken from the height at
  its own centre line — and wears it down a little. Only across: it still
  climbs and falls with the land, which is what makes it a path through a
  valley rather than a canal. Without the levelling it runs along every
  hillside at a camber and reads as a texture painted on a slope.
- `world/ground.js` paints it as bare earth, with a scuffed band either side so
  its edge is not a drawn line.
- `world/scatter.js` multiplies every species' weight by `1 - pathFactor`, so
  nothing grows on it at all, and adds a `vergeWeight` term that crowds flowers
  and grass onto its edge. Both terms are additive, which is what lets a flower
  be worth almost nothing in open forest and a great deal beside the path.
- `render/camera.js` walks it, and aims at the centre line further along rather
  than down the z axis, so a bend swings the whole view with it.

The centre line is a function of z alone. That is a real constraint — the trail
can never fork or double back — and it buys the thing that makes the rest
affordable: "how far am I from the trail?" is a couple of operations with no
curve to search, and the planting asks it a hundred thousand times at load.

## Eye level

The camera is nine units off the ground, which is about a person; one unit is
roughly a fifth of a metre, and every size in `config/flora.js` is scaled to
that. This is the single decision the look depends on. Above the canopy the
same world is legible, tidy and completely inert — a map of a landscape. Down
on the trail the trees tower, the grass reaches your knees, the path leads
somewhere, and the biome change arrives as something noticed on a walk.

Everything else follows from it: fog measured in hundreds of units rather than
thousands, a tight shadow frustum, undergrowth dense enough to carpet the
floor, and instancing tiled in both axes because at eye level most of the
valley is behind you or in the haze.

## Two ground surfaces, and why it matters

`heightAt(x, z)` is a smooth analytic field: four noise terms, plus the valley
walls, plus the mesas, with the water basins carved in. It is not the ground
you can see.

The ground you can see is `buildHeightfield`'s triangles between samples of
that field on a 20-unit lattice, and between lattice lines the two disagree —
by several units on a hillside. Anything seated on the analytic field therefore
floats over or sinks into the drawn surface, and a floating tree is the single
most obvious thing a scene like this can get wrong.

So `surfaceHeight(grid, x, z)` reproduces the mesh's own triangle split exactly,
and everything that stands on the ground — every plant, and the camera — uses
it. The analytic field is used only to build the lattice in the first place.
The split is documented in both files; changing one means changing the other.

## Planting

`world/scatter.js` walks a jittered grid twice: a sparse pass for anything with
a trunk or a silhouette, a dense one for undergrowth. Each cell seeds a
generator from its own coordinates, picks at most one species in proportion to
that species' weight there, and either plants it or leaves the cell empty.

Three properties come out of that, and each replaces machinery a naive approach
would need:

- **Determinism.** A cell always makes the same decision, so the valley is
  identical on every visit and in every test.
- **No rejection sampling.** Species compete for one slot rather than being
  placed independently and pushed apart, so nothing ever overlaps.
- **Thinning for free.** A density multiplier scales every weight, so the
  quality ladder can halve the undergrowth without moving a single tree — and
  a species thins out across a biome boundary rather than stopping at one.

Water is handled by the same mechanism rather than by a special case: a
shoreline term is _added_ to a species' weight, and a species declares which
bands it is willing to be a waterside plant in. A reed has no weight at all
away from a bank; a palm has a little in the desert and a lot beside the oasis
and none at all beside the forest pond.

## Drawing

Everything is instanced. Each species is one geometry — merged from primitives,
flat-shaded, with its colours in a vertex attribute — drawn once per chunk of
the valley. Chunking is what lets the frustum reject the eight thousand plants
behind the camera, which a single world-spanning mesh cannot.

Per-instance colour multiplies the vertex colour, so a stand of pines carries
both its own trunk-and-canopy colours and a per-tree brightness. That
composition is exactly what the note at the top of `render/materials.js` is
about, and it is the trap most likely to catch the next change.

Fetched models take the same path: `render/model-upgrade.js` normalises a glTF
onto the same unit contract as the procedural shapes and instances the same
item list, so an asset that arrives changes what a species looks like and
nothing else. An asset that never arrives changes nothing at all.

They do not replace the procedural meshes, though — they join them. Every tile
of a species with a model has two forms, and one distance test a frame decides
which is visible. That is the only reason the pack is affordable: a Quaternius
pine is five thousand triangles against the procedural one's eighty, and a
forest of two thousand of them is fifteen million triangles a frame. Swapping
at four hundred units — where the fog has already taken most of the detail —
brings that under seven, and the two silhouettes are close enough that the
change is hard to catch.

Each species lists its models best first (pack, then Kenney's kit for the palm
and cactus the free tier lacks) and `main.js` takes the first that loads.

Two of the shapes' conventions are worth knowing before adding one. Everything
is normalised to unit height with its base at zero and placed with a single
uniform scale, so a species' size lives in the world model rather than in its
geometry. And `finish` flat-shades by default but takes `{ smooth: true }`:
rocks, cacti and conifers want hard facets, while broadleaf crowns, bushes and
flower heads want smooth normals and a vertical colour gradient — soft lighting
is a deliberate choice here, and the gradient is what gives a canopy its
volume instead.

## The camera

The camera is the only thing that moves. It drifts down the valley on its own,
holds a fixed height above the drawn ground, looks a few hundred units ahead,
and turns around at either end. The viewer can steer, throttle, drift across
and look around; all three input devices write one snapshot, and the camera
reads only that.

It flies above the canopy on purpose. The interesting thing here is the shape
of the valley and the way one biome becomes another, and neither is visible
from inside a forest.
