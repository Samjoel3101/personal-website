import { Color, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';

/**
 * Instanced placement, cut into chunks along the valley.
 *
 * One InstancedMesh per species would be one draw call for the whole world,
 * which sounds ideal until you notice it also means every tree in the valley
 * is transformed on the GPU every frame, including the eight thousand behind
 * the camera. A single mesh cannot be culled in halves.
 *
 * So each species is split into slabs of `chunk` units along z. A slab that is
 * behind you, or beyond the fog, is rejected by the frustum test for the cost
 * of one bounding-sphere check — and `computeBoundingSphere` is what makes
 * that test true rather than a guess, since an InstancedMesh's own geometry
 * bounds say nothing about where its instances ended up.
 *
 * Scale is uniform and comes from the item's height, which is the contract
 * every shape in ./shapes.js is built to.
 */
const matrix = new Matrix4();
const position = new Vector3();
const quaternion = new Quaternion();
const scale = new Vector3();
const tint = new Color();
const UP = new Vector3(0, 1, 0);

export function instancedChunks(geometry, material, items, { chunk = 600, shadows = true } = {}) {
  const slabs = new Map();
  for (const item of items) {
    const key = Math.floor(item.z / chunk);
    if (!slabs.has(key)) slabs.set(key, []);
    slabs.get(key).push(item);
  }

  const meshes = [];
  for (const slab of slabs.values()) {
    meshes.push(buildSlab(geometry, material, slab, shadows));
  }
  return meshes;
}

function buildSlab(geometry, material, items, shadows) {
  const mesh = new InstancedMesh(geometry, material, items.length);
  mesh.castShadow = shadows;
  mesh.receiveShadow = false;

  items.forEach((item, index) => {
    position.set(item.x, item.y ?? 0, item.z);
    quaternion.setFromAxisAngle(UP, item.rotationY ?? 0);
    scale.setScalar(item.height ?? 1);
    mesh.setMatrixAt(index, matrix.compose(position, quaternion, scale));
    if (item.tint !== undefined) mesh.setColorAt(index, tint.setScalar(item.tint));
  });

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}
