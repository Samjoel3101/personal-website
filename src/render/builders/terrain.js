import { Group } from 'three';
import { TERRAIN } from '../../config/palette.js';
import { WORLD } from '../../config/world.js';
import { MAX_TERRAIN_HEIGHT, heightAt, slopeAt } from '../../world/terrain.js';
import { buildHeightfield } from '../geometry/heightfield.js';
import { tiledSlab } from '../geometry/tiling.js';
import { vertexColoured } from '../materials.js';

/**
 * The rolling ground.
 *
 * 128 cells across a 2048-unit tile — 16-unit facets, about 33k triangles — in
 * one geometry, instanced nine times by the tiling. That is one draw call for
 * the whole landscape, which is what makes a heightfield affordable at this
 * draw distance.
 *
 * Colour is baked per facet into a `color` attribute, so this wants
 * `vertexColoured()`. It is NOT an instance tint: see the colour trap at the
 * top of src/render/materials.js before changing the material.
 */
const CELLS = 128;

/** Above this gradient, ground reads as rock face rather than pasture. */
const ROCK_SLOPE = 0.22;
const STEEP_SLOPE = 0.38;

export function buildTerrain() {
  const group = new Group();
  group.name = 'terrain';

  const geometry = buildHeightfield({
    size: WORLD.SIZE,
    cells: CELLS,
    sample: heightAt,
    tint: tintAt,
  });

  const mesh = tiledSlab(geometry, vertexColoured());
  mesh.receiveShadow = true;
  // Deliberately not a shadow caster. 33k triangles through the shadow pass
  // buys hill-on-hill shading that the fog eats anyway, and self-shadowing a
  // faceted field at this normalBias is where shadow acne comes from.
  mesh.castShadow = false;
  group.add(mesh);

  return group;
}

/**
 * Ground colour from height and steepness. Flats are meadow, the shoulders of
 * a rise dry out toward sand, and anything genuinely steep is exposed rock —
 * which is the same reading the block themes give the scenery standing on it.
 */
function tintAt({ x, y, z }) {
  const gradient = slopeAt(x, z, 8);
  const steepness = Math.hypot(gradient.dx, gradient.dz);

  if (steepness > STEEP_SLOPE) return TERRAIN.ROCK_DARK;
  if (steepness > ROCK_SLOPE) return TERRAIN.ROCK;

  const rise = y / MAX_TERRAIN_HEIGHT;
  if (rise > 0.62) return TERRAIN.SAND;
  if (rise > 0.24) return TERRAIN.FIELD;
  return TERRAIN.FIELD_DARK;
}
