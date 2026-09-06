import { BufferGeometry, Float32BufferAttribute, Group, Mesh } from 'three';
import { TERRAIN } from '../../config/palette.js';
import { surfaceHeightAt } from '../terrain-surface.js';
import { GROUND_LAYER } from '../geometry/flat.js';
import { mergeParts } from '../geometry/merge.js';
import { TILE_OFFSETS } from '../geometry/tiling.js';
import { lambert } from '../materials.js';

/**
 * The dark wet patches that make SURFACE.MUD visible.
 *
 * Read from the same list src/world/surfaces.js samples for grip, so what slows
 * you down and what you can see are the same forty discs — see
 * src/world/puddles.js.
 *
 * They are NOT flat quads on the layer ladder. Puddles sit out in the fields,
 * where the ground has height, so each disc's vertices are lifted onto the
 * heightfield with a fixed clearance. A flat disc would be half-buried on any
 * slope, which is exactly where most of them land.
 *
 * Lifted onto the surface as DRAWN, not as the analytic field — see
 * src/render/terrain-surface.js. Sampling the analytic height here left
 * terrain poking up through three quarters of the puddles, by as much as
 * seven units: a facet mesh does not pass through the smooth field it
 * samples.
 */

const RIM_SEGMENTS = 14;

/**
 * Rings across the disc. One ring is a single fan, and a fan's triangles are
 * several times wider than a terrain facet — so between their corners the
 * ground rises straight through the water. Two rings plus the clearance on
 * GROUND_LAYER.PUDDLE is what measured clean across all forty.
 */
const RINGS = 2;

export function buildPuddles(city) {
  const group = new Group();
  group.name = 'puddles';
  if (!city.puddles || city.puddles.length === 0) return group;

  // Nine tiles baked into one geometry rather than instanced: the discs are
  // terrain-following, so each tile's copy has different vertex heights and
  // there is nothing for an InstancedMesh to share.
  const parts = [];
  for (const offsetX of TILE_OFFSETS) {
    for (const offsetZ of TILE_OFFSETS) {
      for (const puddle of city.puddles) {
        parts.push(disc(puddle, offsetX, offsetZ));
      }
    }
  }

  const mesh = new Mesh(mergeParts(parts, 'puddles'), lambert(TERRAIN.PUDDLE));
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.frustumCulled = false;
  group.add(mesh);
  return group;
}

/** A terrain-following disc for one puddle, at one tile offset. */
function disc(puddle, offsetX, offsetZ) {
  const positions = [];
  const at = (angle, radius) => {
    const x = puddle.x + Math.cos(angle) * radius;
    const z = puddle.z + Math.sin(angle) * radius;
    return [x + offsetX, surfaceHeightAt(x, z) + GROUND_LAYER.PUDDLE, z + offsetZ];
  };

  for (let ring = 0; ring < RINGS; ring += 1) {
    const inner = (ring / RINGS) * puddle.radius;
    const outer = ((ring + 1) / RINGS) * puddle.radius;

    for (let i = 0; i < RIM_SEGMENTS; i += 1) {
      const a0 = (i / RIM_SEGMENTS) * Math.PI * 2;
      const a1 = ((i + 1) / RIM_SEGMENTS) * Math.PI * 2;

      // Wound so every face points +Y: sin runs into +z, so the rim goes
      // clockwise seen from above.
      if (ring === 0) {
        positions.push(...at(0, 0), ...at(a1, outer), ...at(a0, outer));
        continue;
      }
      positions.push(...at(a0, inner), ...at(a1, outer), ...at(a0, outer));
      positions.push(...at(a0, inner), ...at(a1, inner), ...at(a1, outer));
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}
