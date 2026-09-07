import { Color, Group, RepeatWrapping, SRGBColorSpace, Vector3 } from 'three';
import { TERRAIN } from '../../config/palette.js';
import { WORLD } from '../../config/world.js';
import { MAX_TERRAIN_HEIGHT } from '../../world/terrain.js';
import { buildHeightfield } from '../geometry/heightfield.js';
import { tiledSlab } from '../geometry/tiling.js';
import { vertexColoured } from '../materials.js';
import { toDetailTexture } from '../textures/detail.js';
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

/**
 * World units one repeat of the ground texture covers.
 *
 * WORLD.SIZE must divide by it exactly or the texture jumps at the seam and at
 * every tile edge. 64 units is a little over two kart lengths: close enough to
 * read as blades under the wheels, far enough that the repeat does not pattern
 * the whole field.
 */
const UV_TILE = 64;

/**
 * How much of the grass photograph's own contrast reaches the ground.
 *
 * The map multiplies the vertex colours, so the photo is recentred on white
 * first and this is how far it is allowed to swing either side of it. High
 * enough to read as blades under the wheels, low enough that the landscape
 * keeps the colours the palette gives it.
 */
const DETAIL_STRENGTH = 0.8;

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
    uvTile: UV_TILE,
  });

  // Its own material, NOT the shared vertexColoured() instance: a ground
  // texture assigned to that one would land on the trees too, since the cache
  // hands the same object to every caller asking for the same options.
  const material = vertexColoured({ name: 'terrain' });
  const mesh = tiledSlab(geometry, material);
  mesh.receiveShadow = true;
  // Deliberately not a shadow caster. 33k triangles through the shadow pass
  // buys hill-on-hill shading that the fog eats anyway, and self-shadowing a
  // faceted field at this normalBias is where shadow acne comes from.
  mesh.castShadow = false;
  group.add(mesh);

  return {
    group,

    /**
     * Dress the ground in a real material once one arrives.
     *
     * The vertex colours stay: a texture multiplied by them keeps the meadow
     * green, the tops dry and the steep faces stony, so the ground still reads
     * as the same landscape rather than as one photograph repeated over it.
     * Absent textures leave the flat-shaded ground exactly as it was.
     */
    useTexture({ map, normalMap }) {
      if (!map && !normalMap) return false;

      for (const texture of [map, normalMap]) {
        if (!texture) continue;
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        texture.anisotropy = 4;
      }
      if (map) {
        map.colorSpace = SRGBColorSpace;
        // Recentred on white before it is used, or it multiplies the vertex
        // colours into mud — see ../textures/detail.js.
        material.map = toDetailTexture(map, DETAIL_STRENGTH);
      }
      if (normalMap) material.normalMap = normalMap;
      material.needsUpdate = true;
      return true;
    },
  };
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
