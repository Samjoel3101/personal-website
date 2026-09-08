import { Mesh } from 'three';
import { groundColour } from '../world/ground.js';
import { buildHeightfield } from './geometry/heightfield.js';
import { vertexColoured } from './materials.js';

/**
 * The ground, as one mesh.
 *
 * One draw call for the entire valley — forty-odd thousand triangles, which is
 * nothing next to what is planted on it — and a single material, because every
 * colour it needs is baked into its vertices by the world model. There is no
 * texture: at this scale and this palette a tiling ground texture reads as a
 * repeating pattern long before it reads as grass.
 */
export function buildTerrainMesh(valley) {
  const mesh = new Mesh(buildHeightfield(valley.grid, groundColour), vertexColoured());
  mesh.name = 'terrain';
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}
