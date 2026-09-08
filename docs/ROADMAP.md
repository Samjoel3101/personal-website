# Roadmap

The valley is complete and correct as it stands: it generates, it plants, it
draws, and it flies. What follows is work that would make it better, broken
into tasks that can be done one at a time. Each names the files it touches.

## 1. Wind

Nothing moves except the camera, and a landscape where nothing moves reads as a
photograph of a landscape. A single sine on a vertex shader — displacing the
canopy by a fraction of its height, phase offset per instance — would put the
whole valley in motion for the cost of one uniform.

_Touches:_ `src/render/materials.js` (an `onBeforeCompile` on the foliage
material), `src/render/scene.js` (advance the uniform).
_Watch out for:_ the trunk must not move with the canopy; displace by
`position.y / height` so the base stays planted.

## 2. Time of day

`SUN.DIRECTION` is a constant. Making it a function of the journey — dawn over
the forest, hard noon over the desert — would let the light tell the same story
as the ground. The palette already blends per biome, so the machinery exists.

_Touches:_ `src/config/render.js`, `src/render/lighting.js`, `src/render/sky.js`.
_Watch out for:_ the shadow frustum follows the camera; a low sun lengthens
shadows past its edge, which shows up as shadows that end in a straight line.

## 3. A second water body, and a river

Two pools is thin. A river running the length of the forest and drying out in
the scrub would tie the biomes together — and it is the natural home for the
bank-weighted planting that already exists.

_Touches:_ `src/config/world.js`, `src/world/water.js` (a curve rather than a
circle), `src/render/water.js`.
_Watch out for:_ the basin carve is the load-bearing part; see the note on
`basinFactor` about why the pull has to be total at the waterline.

## 4. A third level of detail

There are two forms per species now — the fetched model near the camera, the
procedural shape beyond it — and the swap is a single distance test per tile
(`MODEL_DISTANCE` in `src/render/flora.js`). What is missing is the far end: at
six hundred units a procedural pine is still eighty triangles for four pixels,
and the grass is still drawn one blade at a time.

The gain is in the undergrowth rather than the canopy: forty thousand tufts
means the pack's own grass, clover, pebbles and flowers are all shut out of the
scene on cost alone, and they are lovely.

_Touches:_ `src/render/flora.js`, `src/render/geometry/instancing.js`,
`assets/manifest.json` (the models are in the mirror, unpinned).
_Watch out for:_ popping. The existing swap hides behind fog at four hundred
units; a nearer one will not.

## 5. Branches off the trail

The path is a function of z, which is what makes "how far am I from it?" cheap
enough to ask a hundred thousand times at load — and it is also why the trail
cannot fork. A second, shorter path down to the pond would be the single
biggest thing left for the sense of place. It needs a second centre line
rather than a branching one: `pathFactor` becomes the max of two, and the
terrain levels across whichever is nearer.

_Touches:_ `src/world/path.js`, `src/config/world.js`, `tests/path.test.js`.
_Watch out for:_ the camera follows one line and would need to be told which.

## 6. Deep-linking a viewpoint

`stage.jumpTo` already exists for the tests. Putting the position in the URL
hash would make a particular view shareable, which is most of what a landscape
is for.

_Touches:_ `src/app/session.js`, `src/ui/hud.js`.

## 7. More species

The tables in `src/config/flora.js` are the whole planting: a new species is a
shape in `src/render/geometry/`, an entry in `SHAPES`, and a row of weights.
Obvious gaps: a fallen dead palm, a yucca, a flowering desert shrub, a stand of
birch bracket fungus.

_Watch out for:_ the unit contract in `src/render/geometry/shapes.js`, and the
budget — the ground pass runs tens of thousands of times.
