# Scenery diagnosis

Written before any change to the scene, against
`7237813` on `claude/forest-desert-scenery-overhaul`. Every number here was
measured, not estimated, and the method is given so it can be re-run:

- triangle counts of pack models — parsed out of each GLB's JSON chunk
  (accessor counts over the default scene graph), cross-checked against
  `renderer.info.render.triangles` in the catalogue renders;
- triangle counts of procedural shapes — each builder in `src/render/geometry`
  called in Node and its index count read;
- instance counts and build time — `createValley()` in Node;
- frame budget — `npm run shoot --tier high`, reading `window.__valley.debug`.

## 1. What is actually drawn, per species

`MODEL_DISTANCE` in `src/render/flora.js` is **340** world units. `FOG_FAR` is 800. So the model form occupies a disc of radius 340 and everything from there
out to the fog — the large majority of any wide shot — is procedural. That part
of the brief is confirmed exactly.

**Seventeen species are procedural at every distance.** Not approximately
seventeen: seventeen.

### Canopy — `src/config/canopy.js`

| species        | near camera  | beyond 340     | pack/kit file                  | tris near | tris far |
| -------------- | ------------ | -------------- | ------------------------------ | --------: | -------: |
| pine           | model        | `conifer`      | `Pine_1.glb`                   |     3,949 |       72 |
| spire          | model        | `conifer-tall` | `Pine_3.glb`                   |     4,966 |       80 |
| birch          | model        | `birch`        | `CommonTree_2.glb`             |     5,650 |      284 |
| aspen          | model        | `aspen`        | `CommonTree_4.glb`             |     4,068 |      204 |
| oak            | model        | `oak`          | `CommonTree_1.glb`             |     6,267 |      204 |
| **maple-red**  | `maple-red`  | `maple-red`    | —                              |       204 |      204 |
| **maple-gold** | `maple-gold` | `maple-gold`   | —                              |       204 |      204 |
| twisted        | model        | `oak`          | `TwistedTree_1.glb`            |     9,566 |      204 |
| deadwood       | model        | `dead-tree`    | `DeadTree_1.glb`               |     6,171 |       84 |
| palm           | model        | `palm`         | Kenney `tree_palmDetailedTall` |       336 |      210 |
| saguaro        | model        | `cactus`       | Kenney `cactus_tall`           |       122 |      164 |
| barrel         | model        | `cactus-round` | Kenney `cactus_short`          |       116 |      100 |
| boulder        | model        | `boulder`      | `Rock_Medium_1.glb`            |       344 |      100 |
| shard          | model        | `shard`        | `Rock_Medium_3.glb`            |       524 |       60 |
| **log**        | `log`        | `log`          | —                              |        56 |       56 |

Note the two cacti: the Kenney model is _cheaper_ than the procedural shape it
replaces, so the distance swap costs more than it saves for those two.

### Ground cover — `src/config/ground-cover.js`

| species           | near camera     | beyond 340   | pack file                    | tris near | tris far |
| ----------------- | --------------- | ------------ | ---------------------------- | --------: | -------: |
| **grass-mat**     | `grass-mat`     | `grass-mat`  | —                            |        78 |       78 |
| **dry-mat**       | `dry-mat`       | `dry-mat`    | —                            |        78 |       78 |
| **tuft**          | `grass`         | `grass`      | —                            |        66 |       66 |
| **tall-tuft**     | `tall-grass`    | `tall-grass` | —                            |        66 |       66 |
| **dry-tuft**      | `grass-dry`     | `grass-dry`  | —                            |        42 |       42 |
| fern              | model           | `fern`       | `Fern_1.glb`                 |       290 |       66 |
| **bush**          | `bush`          | `bush`       | —                            |       128 |      128 |
| bush-red          | model           | `bush`       | `Bush_Common.glb`            |       902 |      128 |
| **clover**        | `clover`        | `clover`     | —                            |       220 |      220 |
| plant             | model           | `fern`       | `Plant_1_Big.glb`            |       362 |       66 |
| **pebble**        | `rock`          | `rock`       | —                            |        20 |       20 |
| **flower-blue**   | `flower-blue`   | ”            | —                            |       252 |      252 |
| **flower-purple** | `flower-purple` | ”            | —                            |       252 |      252 |
| **flower-pink**   | `flower-pink`   | ”            | —                            |       204 |      204 |
| **flower-yellow** | `flower-yellow` | ”            | —                            |       252 |      252 |
| **flower-white**  | `flower-white`  | ”            | —                            |       204 |      204 |
| mushroom          | model           | `mushroom`   | `Mushroom_Common.glb`        |       882 |       40 |
| trail-stone       | model           | `flat-stone` | `RockPath_Round_Small_1.glb` |     1,000 |       20 |
| **reed**          | `reed`          | `reed`       | —                            |        36 |       36 |

Bold = procedural at every distance. Every grass, every flower, the clover, the
pebbles, both mats, the plain bush, the reeds, the two maples and the log:
**17 species, and they are 84% of everything planted** (94,246 of 112,323 cover
instances, plus 736 of 3,101 canopy). That is the finding under the complaint.
The pack is doing far less work than the manifest's presence suggests.

## 2. The 68 pack models

14 of the 68 are pinned in `assets/manifest.json`, as counted. All 14 are used;
none is dead weight. The other 54 break down as follows — no model is unused
for a reason more interesting than these four.

**Pinned (14):** `Pine_1`, `Pine_3`, `CommonTree_1`, `CommonTree_2`,
`CommonTree_4`, `TwistedTree_1`, `DeadTree_1`, `Bush_Common`, `Fern_1`,
`Plant_1_Big`, `Mushroom_Common`, `Rock_Medium_1`, `Rock_Medium_3`,
`RockPath_Round_Small_1`.

**Not pinned (54):**

| models                                              |    tris each | why not                                                                                       |
| --------------------------------------------------- | -----------: | --------------------------------------------------------------------------------------------- |
| `Pine_2`, `Pine_4`, `Pine_5`                        |  1,648–3,650 | no species wants a second pine — one model is every pine                                      |
| `CommonTree_3`, `CommonTree_5`                      |  3,184–3,507 | same: three of five are pinned, one per broadleaf species                                     |
| `TwistedTree_2…5`                                   | 9,136–10,106 | near-duplicates of `TwistedTree_1`, and the most expensive models in the pack                 |
| `DeadTree_2…5`                                      |  5,650–6,559 | near-duplicates of `DeadTree_1`                                                               |
| `Grass_Common_Short/Tall`, `Grass_Wispy_Short/Tall` |      157–624 | triangle cost — 2.4–9.5× the procedural tuft, at ~30,000 instances                            |
| `Clover_1`, `Clover_2`                              |     381, 617 | triangle cost — 1.7–2.8× the procedural clover, at 7,690 instances                            |
| `Pebble_Round_1…5`, `Pebble_Square_1…6`             |       50–138 | triangle cost — 2.5–7× the procedural pebble, at 10,870 instances                             |
| `Flower_3/4_Group/Single`                           |    287–1,692 | triangle cost — up to 8× the procedural flower heads                                          |
| `Petal_1…5`                                         |        15–32 | cheap, but no species wants a loose petal; nothing in the world model scatters them           |
| `Plant_1`, `Plant_7`, `Plant_7_Big`                 |       50–362 | near-duplicates of the pinned `Plant_1_Big`, or (Plant_7) a purple succulent no band asks for |
| `Bush_Common_Flowers`                               |        1,370 | no species wants it — though see below, it is a better _green_ bush than the pinned red one   |
| `Mushroom_Laetiporus`                               |        3,218 | triangle cost — 3.6× `Mushroom_Common` for a bracket fungus with no trunk to sit on           |
| `Rock_Medium_2`                                     |          246 | near-duplicate of the two pinned rocks                                                        |
| `RockPath_*` (9 others)                             |    561–3,502 | near-duplicates of the pinned path stone, and the Wide variants are 3.5× its cost             |

The honest summary: **nothing is missing for want of a licence or a download.
It is missing for want of triangles and for want of a species asking for it.**

## 3. Are there pale trees? How many grass looks are there?

Answered by rendering all 68 models individually on neutral ground under the
valley's own light — `npm run shoot -- --catalogue` — and by pulling the
embedded WebP textures out of the GLB buffers and looking at them. Not from
filenames.

### Pale trunks: **no. There are none in the free tier.**

All five `CommonTree` and all five `Pine` share **one** bark texture — a single
mid-brown sheet, `#976047`, luminance 0.42. There is no second bark image
anywhere in the free tier. The only other barks are `Bark_TwistedTree`
(`#5f5652`, a grey-brown, L 0.34) and `Bark_DeadTree` (`#494448`, near-black,
L 0.27) — both **darker** than the common bark, not lighter.

So the pale, almost-white aspen trunks in your third reference frame are not in
this pack and cannot be got from it by choosing a different model. What can be
done:

- **`TwistedTree` is the lightest-_hued_ trunk** (grey rather than red-brown)
  and reads coolest against green. It is also 9,566 triangles, the most
  expensive model in the pack, and its crown is the deep red that was already
  cut back to an accent.
- **`DeadTree_1…5` are the closest silhouette match** to the bare pale trees in
  the _desert_ reference — they are the right shape, just dark. Those five are
  genuinely good and four of them are unused.
- **Tinting can lighten a trunk**, but only upward: the bark map is brown, so a
  material colour ≤ 1 can only darken it further. Getting pale bark means a
  colour factor **above** 1 (three.js allows it) on the bark material alone,
  which is a real option and is what I would try.
- The procedural `birch` and `aspen` shapes already carry `FLORA.BARK_LIGHT`.
  Ironically **the pale trunks in this scene today are the procedural ones**,
  and fetching the pack model actively removes them.

### Foliage: no pale or autumn foliage either.

The `Leaves_NormalTree` atlas is a sheet of greens only. There is no orange, no
gold, no yellow leaf anywhere in the tree textures. The only non-green crown in
the pack is `Leaves_TwistedTree` — a deep blood red (`#a71718`), not the bright
orange of the reference. The autumn colour in the scene today is entirely
procedural (`maple-red`, `maple-gold`), which is why those two have no model.

### Grass: **four models, but only two looks — and a much better lever behind them.**

`Grass_Common_Short` and `Grass_Common_Tall` are the same green look at two
heights. `Grass_Wispy_Short` and `Grass_Wispy_Tall` are the same golden-dry look
at two heights. Add `Clover_1`/`Clover_2` (a bright yellow-green) and the free
tier has **three distinct low-cover looks**, not the six the filenames suggest.

But the interesting thing is _how_ they differ. All four grasses share one
material, one texture and one white base colour. Their `COLOR_0` vertex
attribute is greyscale — an ambient-occlusion ramp, not hue. **The colour comes
from where their UVs land in a texture that is a vertical strip palette**: a
column of dark green, olive, gold and mid-green bands down one edge of an
otherwise white image.

That means the number of grass shades available is not four and not two — it is
**however many columns of that strip we care to sample**, from one geometry, by
offsetting UVs per instance or per variant. The same is true of the `Leaves`
atlas shared by clover, fern, plant and the flowers, which is a whole sheet of
leaves in green, olive, blue, orange, red, purple and magenta.

This is the single most useful thing the catalogue turned up, and it is the
answer to "different shades of grass" that does not cost a triangle.

## 4. The frame budget, honestly

Measured with `npm run shoot -- --tier high`, 1280×720, all 17 model species
loaded. `triangles` and `draws` are `renderer.info.render`, so they include the
shadow pass.

| waypoint | triangles | draw calls |
| -------- | --------: | ---------: |
| forest   | 9,126,165 |        722 |
| pond     | 8,989,761 |        705 |
| woodland | 8,097,925 |        668 |
| scrub    | 2,849,140 |        415 |
| oasis    | 1,411,621 |        238 |
| desert   |   454,533 |         76 |

Instances, and the cost of building them:

|                  |    high | medium |    low |
| ---------------- | ------: | -----: | -----: |
| canopy           |   3,101 |  3,101 |  3,101 |
| ground cover     | 112,323 | 78,684 | 39,124 |
| `createValley()` |   3.0 s |  2.9 s |  2.8 s |

**Two things worth flagging before any of that is used to justify a decision.**

First: **the quality ladder's `groundCover` is dead code.** `QUALITY_TIERS` in
`src/config/render.js` declares 0.35 / 0.7 / 1, `createValley` accepts it, and a
unit test exercises it — but `src/app/session.js:18` calls `createValley()` with
no argument. Every machine, on every tier, builds all 112,323 instances and
spends the full three seconds doing it. The medium and low columns above are
what _would_ happen; they are not what happens. Dropping a tier today changes
the pixel ratio and the shadows and nothing else.

Second, and this is where the headroom is: **the near field is cheap.** At the
forest waypoint, everything within `MODEL_DISTANCE` — the whole disc where pack
models are drawn — is:

- 210 canopy instances, **723k triangles** as models (35k as procedural);
- 7,185 ground-cover instances, **642k triangles**, all procedural.

That is **1.36M of a 9.13M frame**. The other 7.8M is the mid-distance
procedural field between 340 and the fog at 800, drawn twice for anything that
casts a shadow. The expensive part of this frame is not the pack. It is the
procedural filler behind it, and the fact that ground cover is dense enough to
carpet the floor at 340 units where it only needs to at 40.

### What using more of the pack would cost

Straight substitution of every near-field ground-cover instance for its pack
equivalent (~400 tris average against ~89 now): 7,185 × 400 ≈ **2.9M**, so the
forest frame goes 9.13M → **11.4M, up 25%**. That is the number the manifest's
comment is remembering, and it is survivable but not free.

A **third LOD level** changes the arithmetic completely, because instance count
falls with the square of the radius. Pack ground cover inside 120 units instead
of 340 is 7,185 × (120/340)² ≈ **895 instances ≈ 360k triangles** — a **4%**
increase on the forest frame for pack grass in exactly the band where you are
close enough to tell. Inside 160 units it is ~1,590 instances, ~640k, +7%.

So the choice, stated rather than made:

1. **A third LOD ring at ~120–160 units for ground cover.** +4–7% on the worst
   frame. Gets pack grass, clover and pebbles where the eye actually resolves
   them. My recommendation.
2. **Pack grass only for the sparse feature tufts**, procedural mats keeping the
   coverage. Nearly free, but the mats are what you mostly see, so it changes
   less than it sounds.
3. **Raise the budget for desktop and lean on the quality ladder.** This is the
   weakest option _today_ for one specific reason: the ladder cannot currently
   thin ground cover at all (see above). It would have to be fixed first — which
   is worth doing regardless, and is cheap.

None of these is needed for the shade problem. Sampling the grass texture's
palette strip at different columns gives distinct greens and golds from the
geometry already in the scene, at zero triangle cost, and applies to the
procedural shapes too.

---

# Afterwards: what the work changed

Measured the same way, after the scenery round. `npm run shoot -- --tier high`,
1280×720, all 25 model species loaded.

| waypoint | triangles before |     after | draws before | after |
| -------- | ---------------: | --------: | -----------: | ----: |
| forest   |        9,126,165 | 7,771,243 |          722 |   934 |
| pond     |        8,989,761 | 7,521,291 |          705 |   841 |
| woodland |        8,097,925 | 6,494,201 |          668 |   850 |
| scrub    |        2,849,140 | 2,584,612 |          415 |   488 |
| oasis    |        1,411,621 | 1,257,750 |          238 |   292 |
| desert   |          454,533 |   650,260 |           76 |   143 |

**The worst frame got cheaper, not dearer** — 9.13M down to 7.78M — while
gaining pack grass, clover, flowers, pebbles and trail stones, three pines,
five dead trees and a third more ground cover than before (the planting grid
went from 7 units to 6, which is 112,323 instances up to 152,000).

That is not a free lunch, it is the LOD arithmetic in §4 collected. The old
build tiled the model form at 400/420 units and tested each tile's bounding
sphere against a 340-unit radius, so a tile whose centre was 600 units away
still drew as models. Tiling the model form at 200/90 units makes the radius
mean what it says. Draw calls went up by a third in exchange, which is the
right trade at these counts — they are instanced meshes, and 934 of them is
not close to a bottleneck.

Ground cover models now reach 150 units rather than 340, and the near-field
cost is roughly a fifth of what a straight substitution would have been.

## Still true, still not fixed

- **`QUALITY_TIERS[].groundCover` still only applies at boot**, and the session
  starts on `high`, so in practice it is still 1 on every machine. It is now
  wired and documented rather than silently ignored, and the runtime lever that
  replaced it — `detail`, which scales both LOD radii and is instant — is what
  the ladder actually uses. `npm run shoot -- --tier low` draws the valley
  entirely procedurally.
- **The pack's stones are mossy forest rocks.** Their diffuse is a dark
  green-grey, which is right in a wood and reads as holes punched in sand.
  `modelBands` on a species keeps the model where it belongs and the procedural
  shape everywhere else; the pebbles, boulders and shards use it. This is a
  limitation of the free tier, not of the renderer.
- **No pale trunks and no autumn foliage**, as §3 sets out. The palette shift
  and the exposure lift get the _register_ of the reference — a bright ground
  a trunk reads dark against — but a white birch trunk is not in the pack.
