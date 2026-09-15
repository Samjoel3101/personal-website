import { FLORA } from '../../config/palette.js';
import { finish } from './shapes.js';
import { blades } from './cover-shapes.js';

/**
 * Second forms of the three procedural shapes that carry the most weight on
 * the forest floor: fern, grass and sedge-tussock. One identical silhouette,
 * rotated and rescaled by height and tint alone across several thousand
 * instances, is what reads as a stamped-out lawn rather than an undergrowth —
 * see `variantMeshes` in ../flora.js for how a species is split between these
 * and its base form by a hash of where it stands, the same trick a fetched
 * model uses for its own variants.
 *
 * Split out of cover-shapes.js and forest-floor-shapes.js, both at their line
 * ceiling, rather than added to them.
 */

/** Sparser and more upright than `fern` — a plant that got more light. */
export function fernOpen() {
  return finish(
    blades({
      count: 9,
      hex: FLORA.BROADLEAF_DARK,
      tipHex: FLORA.PINE_MID,
      spread: 0.19,
      lean: 0.52,
      thickness: 0.052,
    }),
    'fern',
  );
}

/** Fewer, straighter blades than `grass` — a tighter, younger-looking clump. */
export function grassUpright() {
  return finish(
    blades({
      count: 9,
      hex: FLORA.GRASS_GREEN,
      tipHex: FLORA.GRASS_LIGHT,
      spread: 0.11,
      lean: 0.2,
      thickness: 0.026,
    }),
    'grass',
  );
}

/** Looser and leaning further than `sedgeTussock` — the same plant, windblown. */
export function sedgeTussockLoose() {
  return finish(
    blades({
      count: 12,
      hex: FLORA.PINE_MID,
      tipHex: FLORA.GRASS_LIGHT,
      spread: 0.12,
      lean: 0.24,
      thickness: 0.03,
    }),
    'sedge-tussock',
  );
}
