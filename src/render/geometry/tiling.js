import { Color, DynamicDrawUsage, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import { WORLD } from '../../config/world.js';

/**
 * The world wraps, so the scene renders it tiled 3x3 and slides the whole
 * group under a kart that never moves. That gives a city with no edge and no
 * teleport, at the cost of nine copies of every object.
 *
 * Nine copies sounds expensive and is not: they go into one InstancedMesh, set
 * once at build time, and cost a single draw call. The alternative — recomputing
 * each object's nearest wrapped position every frame — costs CPU forever to
 * save GPU memory that was never scarce.
 *
 * This only holds while the draw distance stays under half the world size; see
 * ATMOSPHERE.MAX_VISIBLE in src/config/render.js.
 */
export const TILE_OFFSETS = [-WORLD.SIZE, 0, WORLD.SIZE];

const matrix = new Matrix4();
const position = new Vector3();
const quaternion = new Quaternion();
const scale = new Vector3();
const colour = new Color();

/**
 * @param {import('three').BufferGeometry} geometry
 * @param {import('three').Material} material
 * @param {Array<{x:number, y?:number, z:number, sx?:number, sy?:number, sz?:number,
 *   rotationY?:number, color?:string}>} items
 * @returns {InstancedMesh}
 */
export function tiledInstances(geometry, material, items) {
  const mesh = new InstancedMesh(geometry, material, items.length * TILE_OFFSETS.length ** 2);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // Nine tiles centred on the origin always straddle the camera; culling the
  // whole mesh would pop the entire city out of view.
  mesh.frustumCulled = false;

  let index = 0;
  for (const offsetX of TILE_OFFSETS) {
    for (const offsetZ of TILE_OFFSETS) {
      for (const item of items) {
        position.set(item.x + offsetX, item.y ?? 0, item.z + offsetZ);
        quaternion.setFromAxisAngle(new Vector3(0, 1, 0), item.rotationY ?? 0);
        scale.set(item.sx ?? 1, item.sy ?? 1, item.sz ?? 1);
        mesh.setMatrixAt(index, matrix.compose(position, quaternion, scale));
        if (item.color) mesh.setColorAt(index, colour.set(item.color));
        index += 1;
      }
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/** The 3x3 tiling of a single pre-positioned geometry, e.g. the ground slab. */
export function tiledSlab(geometry, material) {
  const items = [];
  for (const offsetX of TILE_OFFSETS) {
    for (const offsetZ of TILE_OFFSETS) items.push({ x: offsetX, z: offsetZ });
  }
  const mesh = new InstancedMesh(geometry, material, items.length);
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  mesh.castShadow = false;

  items.forEach((item, index) => {
    position.set(item.x, 0, item.z);
    quaternion.identity();
    scale.set(1, 1, 1);
    mesh.setMatrixAt(index, matrix.compose(position, quaternion, scale));
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}
