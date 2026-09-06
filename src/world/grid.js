import { WORLD } from '../config/world.js';
import { wrapDelta } from '../core/torus.js';

/**
 * Where a point falls in the block grid.
 *
 * Split out of surfaces.js so that puddles.js can ask the same question without
 * importing the sampler that is about to ask puddles.js a question back. A
 * cycle would work in ESM and would still be the wrong shape.
 */

/** Distance from a coordinate to the nearest block centre. */
export function distanceToBlockCentre(coord) {
  const half = WORLD.BLOCK / 2;
  const nearest = Math.round((coord - half) / WORLD.BLOCK) * WORLD.BLOCK + half;
  return Math.abs(wrapDelta(coord - nearest));
}

/** Which block a point falls in, as integer indices. */
export function blockIndexAt(x, z) {
  const size = WORLD.SIZE;
  const fold = (v) => ((Math.floor(v / WORLD.BLOCK) % WORLD.GRID) + WORLD.GRID) % WORLD.GRID;
  return { bi: fold(((x % size) + size) % size), bj: fold(((z % size) + size) % size) };
}

/** The "bi,bj" key blockIndexAt results and the block-key sets agree on. */
export const blockKey = (bi, bj) => `${bi},${bj}`;
