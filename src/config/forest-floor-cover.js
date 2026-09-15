/**
 * The forest-floor-detail kit: temperate-woodland flora that belongs under
 * the canopy and nowhere past it — every weight below is zero in scrub and
 * desert. Split out of src/config/ground-cover.js only because that file is
 * at its line ceiling; see the big comment at the top of it (and of
 * src/config/flora.js) for what every field here means, and
 * src/config/ground-cover.js for how this joins the rest of the undergrowth.
 */
export const FOREST_FLOOR_COVER = Object.freeze([
  {
    id: 'bramble',
    /** A thicket, not a shrub: it wants the same shaded, stony ground bush-red
     *  does, plus a little of clover's damp. */
    patch: { shade: 1.3, stony: 0.6, clover: 0.3 },
    shade: 0.3,
    assets: [['ground.bramble-thicket']],
    /** The raw model is a footprint-capped pancake (normalisedParts' WIDEST
     *  ratio kicks in — see the note in model-upgrade.js), so at 1 it would
     *  come out visibly shorter than the procedural thicket beside it. Pulled
     *  up to bring its height back in line, which leaves it wider than tall —
     *  a real bramble sprawls, so that reads as thicket rather than shrub. */
    modelScale: 1.4,
    shape: 'bramble',
    height: [4, 7.5],
    /** Raised from its original 0.06/0.08: at that weight it was losing every
     *  contested cell to fern and clover and almost never actually got
     *  planted, wired but invisible in practice. Still well behind the
     *  coverage species — a thicket is an occasional feature, not a carpet. */
    weight: { forest: 0.1, woodland: 0.13, scrub: 0.01, desert: 0 },
    /** Brambles classically crowd a path's edge — a deliberate choice, not an
     *  accident. */
    vergeWeight: 0.4,
  },
  {
    id: 'leaf-litter-mat',
    /** Coverage — now the primary job under the canopy, the one grass-mat and
     *  dry-mat used to carry there. Read as a height; the model spreads about
     *  twice this across, matching grass-mat. */
    patch: { meadow: 0.6, clover: 0.9, shade: 1.1, stony: 0.5 },
    shade: 0.9,
    assets: [['ground.forest-floor-leaf-litter']],
    /** The raw model is almost flat (a scatter of leaves, not a standing
     *  plant), so normalisedParts' footprint cap dominates it — see the note
     *  in model-upgrade.js. Tuned to spread about twice the declared height,
     *  the same target grass-mat's own geometry hits; the litter itself
     *  stands barely off the ground, which is right for fallen leaves. */
    modelScale: 1.1,
    shape: 'leaf-litter-mat',
    height: [2.5, 4.5],
    /** Broadleaf woodland is where fallen leaves belong most; needle-mat takes
     *  the deeper pine forest instead — between the two the floor is covered
     *  in kit mats end to end. */
    weight: { forest: 0.36, woodland: 0.46, scrub: 0.02, desert: 0 },
  },
  {
    id: 'needle-mat',
    /** Concentrated in the deep, pine-heavy forest specifically rather than
     *  the broadleaf woodland further along — this and leaf-litter-mat
     *  together are now the floor's default coverage, the job grass-mat and
     *  dry-mat used to have. */
    patch: { shade: 1.2, clover: 0.5, stony: 0.4 },
    shade: 1,
    assets: [['ground.pine-needle-bed']],
    /** Same footprint-capped pancake as leaf-litter-mat's model, tuned the
     *  same way. */
    modelScale: 1.1,
    shape: 'needle-mat',
    height: [2.5, 4.5],
    weight: { forest: 0.5, woodland: 0.14, scrub: 0, desert: 0 },
  },
  {
    id: 'moss',
    patch: { shade: 1.6, clover: 0.8 },
    shade: 1,
    assets: [['ground.moss-patch']],
    /** A mild footprint-cap correction — the raw clump is a little wider than
     *  it is tall, so left at 1 it undershoots the procedural clump's
     *  height. */
    modelScale: 1.2,
    shape: 'moss',
    height: [1, 2],
    /** Raised from 0.08/0.05 — the same "wired but too rare to notice" fix as
     *  bramble's, above. */
    weight: { forest: 0.16, woodland: 0.1, scrub: 0, desert: 0 },
  },
  {
    id: 'sedge',
    patch: { shade: 1.3, clover: 1.1, meadow: 0.3 },
    shade: 0.6,
    /** Two forms, picked per plant — see pebble's note on repetition. */
    assets: [['ground.sedge-tussock', 'ground.wood-sedge-clump']],
    /** Same family as tuft/tall-tuft below: a modelled clump of fine blades
     *  reads denser — and so visually larger — than the same bounding height
     *  in the procedural shape's few broad blades. */
    modelScale: 0.6,
    shape: 'sedge-tussock',
    height: [3.5, 6],
    /** Carries the dense-grass job 'tuft' used to, in the same order of
     *  magnitude. */
    weight: { forest: 0.32, woodland: 0.3, scrub: 0, desert: 0 },
  },
  {
    id: 'vernal-grass',
    patch: { meadow: 1.3, clover: 0.4, flowery: 0.3 },
    shade: -0.1,
    assets: [['ground.sweet-vernal-grass']],
    /** Matches 'tuft' below — same procedural shape, same dense-clump-versus-
     *  broad-blade mismatch. */
    modelScale: 0.55,
    /** Same procedural shape as 'tuft' — see the note in shape-registry.js. */
    shape: 'vernal-grass',
    height: [3, 5.5],
    /** Carries the job 'tuft' used to, alongside sedge. */
    weight: { forest: 0.26, woodland: 0.3, scrub: 0, desert: 0 },
  },
  {
    id: 'fescue',
    patch: { dry: 0.6, meadow: 0.9, stony: 0.4 },
    shade: -0.3,
    assets: [['ground.woodland-fescue']],
    /** Matches 'tall-tuft' below — same procedural shape, same reasoning. */
    modelScale: 0.6,
    /** Same procedural shape as 'tall-tuft' — see the note in
     *  shape-registry.js. */
    shape: 'fescue',
    height: [4, 7],
    /** Carries the job 'tall-tuft' and 'dry-tuft' used to under the canopy. */
    weight: { forest: 0.24, woodland: 0.3, scrub: 0, desert: 0 },
  },
  {
    id: 'wild-garlic',
    patch: { shade: 1.4, clover: 0.6 },
    shade: 0.9,
    assets: [['ground.wild-garlic']],
    /** A leaf clump, the same category clover is — matched to its modelScale
     *  rather than grass's. */
    modelScale: 0.85,
    shape: 'wild-garlic',
    height: [2.5, 4],
    /** Raised from 0.05/0.06 — see bramble's note above. */
    weight: { forest: 0.09, woodland: 0.1, scrub: 0, desert: 0 },
  },
  {
    id: 'wood-anemone',
    patch: { shade: 1.5, clover: 0.5 },
    shade: 0.85,
    assets: [['ground.wood-anemone-cluster']],
    shape: 'wood-anemone',
    height: [1.6, 2.6],
    /** Takes over the small-white-star-flower job flower-white used to carry
     *  under the canopy. Raised from 0.045/0.05 — see bramble's note above. */
    weight: { forest: 0.08, woodland: 0.09, scrub: 0, desert: 0 },
  },
  {
    id: 'bluebell',
    patch: { shade: 1.2, clover: 0.4, meadow: 0.2 },
    shade: 0.5,
    assets: [['ground.woodland-bluebells']],
    shape: 'bluebell',
    height: [2.8, 4.5],
    /** Raised from 0.05/0.06 — see bramble's note above. */
    weight: { forest: 0.09, woodland: 0.1, scrub: 0, desert: 0 },
    /** A classic drift along a woodland path edge. */
    vergeWeight: 0.6,
  },
]);
