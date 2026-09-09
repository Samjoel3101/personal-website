# Reference frames

Art direction for the valley. Three frames, and for each one a checklist of
the specific qualities we are matching — written so that each line can be
judged true or false from a screenshot, because these are the acceptance
criteria the scenery work is measured against.

`npm run shoot` builds a contact sheet at `shots/index.html` that puts each
waypoint beside the frame it is chasing. Judge against that, not from memory.

## Provenance

These are **promotional renders by Quaternius**, the author of the Stylized
Nature MegaKit this scene's art direction follows
(<https://quaternius.com/packs/stylizednaturemegakit.html>, shown at
<https://www.youtube.com/watch?v=Ig1Vn3zPWQY>). They are kept here as
**internal art-direction reference only** — they are not redistributed assets,
nothing in the build reads them, and no pixel of them reaches the shipped
site. The models themselves are CC0 and are fetched, not committed; see
`assets/manifest.json`.

Cropped from full-screen video captures; letterboxing removed, otherwise
unaltered.

---

## `forest-path-summer.jpg`

A dirt trail through deep summer forest, seen at eye level. This is the
`forest` and `pond` waypoints.

- [ ] **The ground is completely covered.** No bare soil anywhere except the
      trail itself — the green is plants, not a green surface.
- [ ] **The trail is a surface, not a stripe.** Stones lie _on_ the earth of
      the path, and its edges are ragged where undergrowth encroaches, not
      drawn.
- [ ] **Grass appears in at least three distinct shades in one frame** —
      mid-green, a yellow-green, and a dry gold — not one green at three
      brightnesses.
- [ ] **Mushrooms occur in clusters of three to five**, at trunk bases and in
      shade, never singly out in the open.
- [ ] **Trunks fill the frame edges.** Foreground trees are cut off by the top
      of the frame; you are under the canopy, not looking at it.
- [ ] **Trees vary in silhouette within one species.** No two pines in frame
      are the same shape.
- [ ] **Light reaches the floor in patches** — a lit clearing mid-frame against
      shaded foreground.
- [ ] **Undergrowth is layered**: low mats, then leafy plants, then knee-high
      grass, then bushes — at least three heights between the floor and the
      canopy.
- [ ] **Boulders sit in the undergrowth**, part-buried and moss-topped, not
      resting on it.
- [ ] At least one **warm accent tree** (orange/red crown) is visible among the
      greens, as a small fraction of the whole.

## `forest-clearing-autumn.jpg`

An open hillside at the turn of the season, rocks and autumn trees. This is the
`woodland` and `scrub` waypoints.

- [ ] **Pale, near-white trunks are present** among the darker ones.
      _(Known gap — see below.)_
- [ ] **A mass of warm colour reads at distance**: the far hillside is a solid
      band of orange/gold, not individually legible trees.
- [ ] **Flowers grow in clumps of a single colour**, not as a mixed sprinkle —
      a patch of coral, a patch of yellow.
- [ ] **Rock outcrops, not scattered rocks.** Boulders gather into formations
      several stones across with grass growing between them.
- [ ] **Loose stones lie on the bare earth** of the clearing, in the open.
- [ ] **The grass has visible tonal drift across the frame** — yellow-green in
      the light, deeper green in shade, gold on the far slope.
- [ ] **Foreground plants break the bottom edge** of the frame.
- [ ] **The sky is a bright, saturated blue with soft cloud**, occupying real
      space in the frame rather than sitting behind fog.
- [ ] **Small shrubs carry flowers**, distinct from the flowering ground cover.
- [ ] **Ferns appear in shade under and beside the rocks.**

## `desert-wash-bare-trees.jpg`

A dry wash between mesas, bare trees, stones. This is the `oasis` and `desert`
waypoints.

- [ ] **Bare dark trees stand against pale sand** — the strongest value
      contrast in the frame is trunk against ground.
- [ ] **A line of stones traces the dry watercourse**, reading as a channel
      rather than as scattered pebbles.
- [ ] **The ground is not empty.** Dry tufts, small shrubs and stones break up
      the sand everywhere, at a much lower density than the forest but never
      to nothing.
- [ ] **Mesas and rock walls give the horizon structure** rather than a plain
      dune line.
- [ ] **Warm and cool accents survive**: a few red/orange plants and some
      green shrubs against the sand, so it is not monochrome.
- [ ] **The sand shows tonal variation** — lighter crests, darker hollows,
      cracked patches — not one flat colour.
- [ ] **Dead trees vary in silhouette**; no two in frame are the same shape.
- [ ] **The trail is still legible** as a lighter, smoother line through the
      wash.

---

## What the free tier cannot give us

Recorded here so the checklist is honest about which boxes will never tick.
The evidence is in `docs/SCENERY-DIAGNOSIS.md` §3.

**Pale trunks.** The free MegaKit has exactly **one** bark texture for every
`CommonTree` and every `Pine` — a mid-brown, `#976047`. The only other barks
are the twisted tree's grey-brown and the dead tree's near-black, both
_darker_. The white aspen trunks in `forest-clearing-autumn.jpg` are not in the
pack in any form. The closest we can get is brightening the bark material above
1.0 on a subset of trees, and keeping the procedural `birch`/`aspen` shapes —
which already carry a light bark — rather than replacing them with pack models.

**Autumn foliage.** The tree leaf atlas is greens only. There is no orange or
gold leaf anywhere in the free tier; the pack's single non-green crown is the
twisted tree's deep blood red. All the autumn colour in this scene is
procedural, and has to stay that way.
