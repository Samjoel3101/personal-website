import { IcosahedronGeometry } from 'three';
import { ROCK } from '../../config/palette.js';
import { finish, part, roughen } from './shapes.js';

/**
 * Stones: a pebble, a boulder, and a shard.
 *
 * All three are jittered icosahedra, which is the whole of low-poly rock art,
 * and all three are pale. That is the point of them. A scene this saturated
 * has no light values in it at all except the sky, and a stand of near-white
 * rock breaking out of the undergrowth is what gives the eye somewhere to
 * rest — grey stones simply read as holes.
 */

/** Small, flat, and scattered by the thousand. */
export function pebble() {
  return finish(
    [
      part(roughen(new IcosahedronGeometry(0.5, 0), 0.5, 3), ROCK.PALE, {
        scale: [1.15, 0.85, 1],
        y: 0.34,
      }),
    ],
    'pebble',
  );
}

/**
 * A stone worn flat into a path: wide, low, barely proud of the ground.
 *
 * Sized by height like everything else, so the shape carries its own
 * proportions — a metre across and a hand deep.
 */
export function flatStone() {
  return finish(
    [
      part(roughen(new IcosahedronGeometry(0.5, 0), 0.35, 23), ROCK.PALE, {
        scale: [2.6, 0.75, 2.2],
        y: 0.3,
      }),
    ],
    'flat-stone',
  );
}

/** A rounded lump with a darker one leaning on it. */
export function boulder() {
  return finish(
    [
      part(roughen(new IcosahedronGeometry(0.5, 1), 0.36, 5), ROCK.PALE, {
        scale: [1.15, 1, 1.05],
        y: 0.44,
      }),
      part(roughen(new IcosahedronGeometry(0.2, 0), 0.5, 9), ROCK.SHADE, {
        x: 0.4,
        y: 0.15,
        z: 0.22,
      }),
    ],
    'boulder',
  );
}

/**
 * Angular slabs pushed up out of the ground at an angle.
 *
 * The single most recognisable prop in the reference art, and the reason it is
 * a separate species rather than a tall boulder: a rock that leans reads as
 * something the ground did, and a rock that sits reads as something dropped.
 */
export function shard() {
  return finish(
    [
      part(roughen(new IcosahedronGeometry(0.42, 0), 0.22, 11), ROCK.PALE, {
        scale: [0.66, 1.3, 0.6],
        lean: 0.16,
        y: 0.52,
      }),
      part(roughen(new IcosahedronGeometry(0.34, 0), 0.24, 13), ROCK.PALE, {
        scale: [0.6, 1, 0.55],
        lean: -0.3,
        spin: 0.8,
        x: 0.24,
        y: 0.32,
        z: 0.12,
      }),
      part(roughen(new IcosahedronGeometry(0.26, 0), 0.4, 17), ROCK.SHADE, {
        scale: [1, 0.6, 1],
        x: -0.22,
        y: 0.12,
        z: -0.14,
      }),
    ],
    'shard',
  );
}
