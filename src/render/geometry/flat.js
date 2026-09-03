import { PlaneGeometry } from 'three';

/**
 * Y offsets for the flat layers of the road surface.
 *
 * Everything on the ground is a coplanar quad, so the only thing keeping lane
 * paint from z-fighting with the asphalt under it is this ladder. Add a layer
 * by giving it its own rung, never by reusing one.
 *
 * Order matters as much as spacing. The pavement quad is wider than the road
 * quad it flanks, so it has to sit BELOW the asphalt — put it above and it
 * quietly paves over every street in the city.
 */
export const GROUND_LAYER = Object.freeze({
  BASE: 0,
  PLAZA: 0.02,
  PAVEMENT: 0.04,
  ROAD: 0.06,
  KERB: 0.08,
  MARKING: 0.1,
  PAD: 0.12,
  PAD_CHEVRON: 0.14,
});

/** A horizontal quad of `width` by `depth`, centred on (x, z) at height y. */
export function flatQuad(width, depth, x, z, y) {
  const geometry = new PlaneGeometry(width, depth);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(x, y, z);
  return geometry;
}
