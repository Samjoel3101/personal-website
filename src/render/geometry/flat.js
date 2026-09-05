import { PlaneGeometry } from 'three';

/**
 * Y offsets for the flat layers of the track surface.
 *
 * Everything on the ground is a coplanar strip, so the only thing keeping a
 * tyre rut from z-fighting with the dirt under it is this ladder. Add a layer
 * by giving it its own rung, never by reusing one.
 *
 * Order matters as much as spacing. The verge ribbon is wider than the track
 * ribbon it flanks, so it has to sit BELOW the dirt — put it above and it
 * quietly grasses over every stage on the map. Same rule the pavement had.
 *
 * PUDDLE is the odd one out: puddles sit out in the fields where the ground has
 * height, so its rung is used as a clearance above the terrain rather than
 * above y = 0. It is on the same ladder anyway, because the question it answers
 * is the same one.
 */
export const GROUND_LAYER = Object.freeze({
  BASE: 0,
  PADDOCK: 0.02,
  VERGE: 0.04,
  TRACK: 0.06,
  MUD_EDGE: 0.08,
  RUT: 0.1,
  PAD: 0.12,
  PAD_CHEVRON: 0.14,
  START_LINE: 0.16,
  PUDDLE: 0.18,
});

/** A horizontal quad of `width` by `depth`, centred on (x, z) at height y. */
export function flatQuad(width, depth, x, z, y) {
  const geometry = new PlaneGeometry(width, depth);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(x, y, z);
  return geometry;
}
