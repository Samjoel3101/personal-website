import { Color, Group, Vector3 } from 'three';
import { TERRAIN } from '../../config/palette.js';
import { WORLD } from '../../config/world.js';
import { MAX_TERRAIN_HEIGHT } from '../../world/terrain.js';
import { buildHeightfield } from '../geometry/heightfield.js';
import { tiledSlab } from '../geometry/tiling.js';
import { vertexColoured } from '../materials.js';
import { TERRAIN_CELLS, meshHeightAt, surfaceSlopeAt } from '../terrain-surface.js';

/**
 * The rolling ground.
 *
 * 128 cells across a 2048-unit tile — 16-unit facets, about 33k triangles — in
 * one geometry, instanced nine times by the tiling. That is one draw call for
 * the whole landscape, which is what makes a heightfield affordable at this
 * draw distance.
 *
 * Colour is baked per vertex into a `color` attribute, so this wants
 * `vertexColoured()`. It is NOT an instance tint: see the colour trap at the
 * top of src/render/materials.js before changing the material.
 */

/** Above this gradient, ground reads as rock face rather than pasture. */
const ROCK_SLOPE = 0.22;
const STEEP_SLOPE = 0.38;

/** Where the meadow gives way to the dry, sun-bleached tops. */
const DRY_FROM = 0.3;

const FIELD_DARK = new Color(TERRAIN.FIELD_DARK);
const FIELD = new Color(TERRAIN.FIELD);
const SAND = new Color(TERRAIN.SAND);
const ROCK = new Color(TERRAIN.ROCK);
const ROCK_DARK = new Color(TERRAIN.ROCK_DARK);

const scratch = new Color();
const up = new Vector3();

export function buildTerrain() {
  const group = new Group();
  group.name = 'terrain';

  const geometry = buildHeightfield({
    size: WORLD.SIZE,
    cells: TERRAIN_CELLS,
    sample: meshHeightAt,
    normal: normalAt,
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
 * The surface normal from the field's own gradient.
 *
 * Not the facet's normal: a facet normal makes every cell a visibly separate
 * plate, and at this cell size that reads as corrugation rather than as
 * hills. The gradient is what the ground would be doing if it were smooth,
 * which is what a rally hillside should look like from a moving kart.
 */
function normalAt(x, z) {
  const gradient = surfaceSlopeAt(x, z);
  return up.set(-gradient.dx, 1, -gradient.dz).normalize();
}

/**
 * Ground colour from height and steepness. Flats are meadow, the shoulders of
 * a rise dry out toward sand, and anything genuinely steep is exposed rock —
 * which is the same reading the block themes give the scenery standing on it.
 *
 * Every transition is a blend rather than a threshold. Thresholds put a hard
 * contour line across an otherwise smooth hillside, and a contour that does
 * not follow any feature of the ground reads as a rendering fault.
 */
function tintAt({ x, y, z }) {
  const rise = clamp01(y / MAX_TERRAIN_HEIGHT);
  scratch.copy(FIELD_DARK).lerp(FIELD, smoothstep(0, DRY_FROM, rise));
  scratch.lerp(SAND, smoothstep(DRY_FROM, 1, rise) * 0.85);

  const gradient = surfaceSlopeAt(x, z);
  const steepness = Math.hypot(gradient.dx, gradient.dz);
  const stone = smoothstep(ROCK_SLOPE, STEEP_SLOPE, steepness);
  if (stone > 0) {
    scratch.lerp(steepness > STEEP_SLOPE ? ROCK_DARK : ROCK, stone);
  }

  return scratch;
}

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}
