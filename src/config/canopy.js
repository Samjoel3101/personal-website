/**
 * Everything with a trunk or a silhouette: the sparse planting pass.
 *
 * See src/config/flora.js for what the fields mean — this file is the table
 * itself, kept apart from the undergrowth so that neither outgrows a screen.
 */
export const CANOPY = Object.freeze([
  {
    id: 'pine',
    assets: [
      ['pack.nature.pine', 'pack.nature.pine-2', 'pack.nature.pine-broad'],
      'kit.nature.tree.pine',
    ],
    shape: 'conifer',
    height: [46, 88],
    weight: { forest: 0.42, woodland: 0.08, scrub: 0.01, desert: 0 },
  },
  {
    id: 'spire',
    assets: [['pack.nature.pine-slim', 'pack.nature.pine-slim-2'], 'kit.nature.tree.spire'],
    shape: 'conifer-tall',
    height: [70, 120],
    weight: { forest: 0.2, woodland: 0.03, scrub: 0, desert: 0 },
  },
  {
    id: 'birch',
    shape: 'birch',
    assets: [['pack.nature.tree-broad', 'pack.nature.tree-tall']],
    height: [44, 72],
    weight: { forest: 0.3, woodland: 0.26, scrub: 0.02, desert: 0 },
  },
  {
    id: 'aspen',
    assets: [['pack.nature.tree-slim', 'pack.nature.tree-tall']],
    shape: 'aspen',
    height: [40, 68],
    weight: { forest: 0.2, woodland: 0.24, scrub: 0.02, desert: 0 },
  },
  {
    id: 'oak',
    assets: [['pack.nature.tree', 'pack.nature.tree-round'], 'kit.nature.tree.oak'],
    shape: 'oak',
    height: [38, 62],
    weight: { forest: 0.18, woodland: 0.24, scrub: 0.03, desert: 0 },
  },
  {
    id: 'maple-red',
    shape: 'maple-red',
    height: [36, 60],
    /** Autumn crowns are the warm half of the forest. Weighted highest at the
     *  turn rather than in the deep forest, so walking out of the pines walks
     *  into the colour. */
    weight: { forest: 0.3, woodland: 0.26, scrub: 0.02, desert: 0 },
  },
  {
    id: 'maple-gold',
    shape: 'maple-gold',
    height: [34, 58],
    weight: { forest: 0.26, woodland: 0.24, scrub: 0.03, desert: 0 },
  },
  {
    id: 'twisted',
    shape: 'oak',
    height: [30, 54],
    /** Gnarled and half-bare: the tree that carries the woodland into the
     *  scrub, where a full green crown would look irrigated. */
    /** Sparingly. Its crown is the pack's deep red, which is striking as an
     *  accent in a green wood and overwhelming as a third of it. */
    weight: { forest: 0.025, woodland: 0.07, scrub: 0.07, desert: 0 },
    assets: [['pack.nature.twisted', 'pack.nature.twisted-2', 'pack.nature.twisted-3']],
  },
  {
    id: 'deadwood',
    assets: [
      [
        'pack.nature.dead',
        'pack.nature.dead-2',
        'pack.nature.dead-3',
        'pack.nature.dead-4',
        'pack.nature.dead-5',
      ],
    ],
    shape: 'dead-tree',
    height: [26, 52],
    /** The desert's only silhouette, and the strongest value contrast in that
     *  half of the valley: five near-black bare forms against pale sand. Five
     *  *forms* — this is the species that most obviously repeats when it is one
     *  model, because there is nothing else in frame to look at. */
    weight: { forest: 0.02, woodland: 0.05, scrub: 0.14, desert: 0.11 },
  },
  {
    id: 'palm',
    assets: ['kit.nature.tree.palm'],
    shape: 'palm',
    height: [42, 74],
    weight: { forest: 0, woodland: 0, scrub: 0.01, desert: 0.025 },
    /** Palms mark water. Added to the weight above rather than multiplied into
     *  it, so a bank is worth far more than a dune — which is what makes the
     *  oasis read as an oasis. */
    bankWeight: 0.7,
    /** …but only where a palm belongs. Water draws plants to it; it does not
     *  make a palm reasonable on the bank of a forest pond. */
    bankBands: { forest: 0, woodland: 0, scrub: 1, desert: 1 },
  },
  {
    id: 'saguaro',
    assets: ['kit.nature.cactus.tall'],
    shape: 'cactus',
    height: [22, 46],
    weight: { forest: 0, woodland: 0, scrub: 0.05, desert: 0.15 },
  },
  {
    id: 'barrel',
    assets: ['kit.nature.cactus.short'],
    shape: 'cactus-round',
    height: [6, 12],
    weight: { forest: 0, woodland: 0, scrub: 0.035, desert: 0.08 },
  },
  {
    id: 'boulder',
    /** Rocks come in outcrops, not one at a time. The stony community is what
     *  gathers them — and the same community thins the grass around them. */
    patch: { stony: 1.9, dry: 0.4, meadow: 0.2 },
    assets: [['pack.nature.rock', 'pack.nature.rock-2']],
    modelBands: ['forest', 'woodland', 'scrub'],
    shape: 'boulder',
    height: [8, 26],
    weight: { forest: 0.09, woodland: 0.06, scrub: 0.06, desert: 0.02 },
    maxSlope: 1.3,
  },
  {
    id: 'shard',
    patch: { stony: 1.8, dry: 0.5, meadow: 0.25 },
    assets: [['pack.nature.rock-standing']],
    modelBands: ['forest', 'woodland', 'scrub'],
    shape: 'shard',
    height: [10, 30],
    /** Pale rock breaking out of the undergrowth, in every band. It is the
     *  only light value in the picture besides the sky. */
    weight: { forest: 0.09, woodland: 0.08, scrub: 0.09, desert: 0.06 },
    maxSlope: 1.3,
    /** Weighted heavily onto the trail's edge, where a stone reads as
     *  something the path was cut around. */
    vergeWeight: 0.6,
  },
  {
    id: 'log',
    patch: { shade: 1.2, clover: 0.8, meadow: 0.4 },
    shape: 'log',
    /** Read as a girth, not a height: the shape lies down, and it is about
     *  six times longer than the number given here. */
    height: [2.6, 4.2],
    weight: { forest: 0.08, woodland: 0.04, scrub: 0.01, desert: 0 },
    /** A fallen trunk lies on the flat. On a hillside it beds into the slope
     *  at one end and juts out of it at the other, which reads as a bug. */
    maxSlope: 0.3,
  },
]);
