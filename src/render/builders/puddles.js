import { BufferGeometry, Float32BufferAttribute, Group, Mesh } from 'three';
import { TERRAIN } from '../../config/palette.js';
import { heightAt } from '../../world/terrain.js';
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
 */

const RIM_SEGMENTS = 14;

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

/** A terrain-following fan for one puddle, at one tile offset. */
function disc(puddle, offsetX, offsetZ) {
  const positions = [];
  const lift = (angle, radius) => {
    const x = puddle.x + Math.cos(angle) * radius;
    const z = puddle.z + Math.sin(angle) * radius;
    return [x + offsetX, heightAt(x, z) + GROUND_LAYER.PUDDLE, z + offsetZ];
  };
  const centre = [
    puddle.x + offsetX,
    heightAt(puddle.x, puddle.z) + GROUND_LAYER.PUDDLE,
    puddle.z + offsetZ,
  ];

  for (let i = 0; i < RIM_SEGMENTS; i += 1) {
    const a0 = (i / RIM_SEGMENTS) * Math.PI * 2;
    const a1 = ((i + 1) / RIM_SEGMENTS) * Math.PI * 2;
    // Wound so the fan faces +Y: sin runs into +z, so the rim goes clockwise.
    positions.push(...centre, ...lift(a1, puddle.radius), ...lift(a0, puddle.radius));
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}
