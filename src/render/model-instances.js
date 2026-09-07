import { Box3, Color, MeshLambertMaterial, Vector3 } from 'three';
import { KIT_TINTS } from '../config/palette.js';
import { tiledInstances } from './geometry/tiling.js';

/**
 * Turns a loaded glTF into instanced meshes.
 *
 * The naive way to put a downloaded decoration in nine tiled places is to clone
 * its scene graph nine times per site. At forty sites that is three hundred and
 * sixty scene graphs and as many draw calls. Instead this bakes each mesh's
 * world transform into a copy of its geometry, normalises the whole model onto
 * a unit footprint centred on x/z with its base at y = 0 — the same contract
 * ./geometry/scenery-shapes.js authors to — and hands the result to
 * tiledInstances. One draw call per mesh in the model, whatever the site count.
 *
 * Everything here must survive `model` being null: assets are an upgrade, never
 * a dependency.
 */

/**
 * Downloaded materials, flattened onto the scene's own lighting model.
 *
 * Two reasons, and the second one is not cosmetic. A glTF arrives as
 * MeshStandardMaterial, which is roughly twice the fragment cost of the
 * Lambert everything else here uses and shades visibly differently beside it.
 * And Kenney's untextured kits — every bush, tree and boulder in the Nature
 * Kit — are authored `metallicFactor: 1`. A fully metallic surface with no
 * environment map to reflect has nothing to return but black, so those models
 * render as silhouettes and look for all the world like the vertexColors trap
 * two doors down in ./materials.js.
 *
 * A recognised material name is also repainted from this stage's own palette
 * — see KIT_TINTS. The untextured kits do not ship the colours they are drawn
 * with: their greens arrive teal and their browns salmon.
 *
 * Keyed by the source material so a kit sharing one atlas across forty models
 * still ends up sharing one material.
 */
const flattened = new Map();

function flatten(material) {
  if (!material || material.isMeshLambertMaterial) return material;
  if (flattened.has(material)) return flattened.get(material);

  const tint = KIT_TINTS[material.name];
  const lambert = new MeshLambertMaterial({
    color: tint ? new Color(tint) : (material.color?.clone() ?? 0xffffff),
    map: material.map ?? null,
    transparent: material.transparent,
    opacity: material.opacity,
    alphaTest: material.alphaTest,
    side: material.side,
  });
  lambert.name = material.name;
  flattened.set(material, lambert);
  return lambert;
}

/**
 * @param {import('three').Object3D|null} model
 * @returns {{parts: {geometry, material}[], aspect: number}} normalised parts
 *   and how tall the model stands once its footprint is one unit wide
 */
export function normalisedParts(model) {
  if (!model) return { parts: [], aspect: 1 };
  model.updateMatrixWorld(true);

  const parts = [];
  model.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const geometry = child.geometry.clone();
    geometry.applyMatrix4(child.matrixWorld);
    parts.push({ geometry, material: flatten(child.material) });
  });
  if (parts.length === 0) return { parts: [], aspect: 1 };

  const bounds = new Box3();
  for (const part of parts) {
    part.geometry.computeBoundingBox();
    bounds.union(part.geometry.boundingBox);
  }
  const centre = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const footprint = Math.max(size.x, size.z) || 1;

  for (const part of parts) {
    part.geometry.translate(-centre.x, -bounds.min.y, -centre.z);
    part.geometry.scale(1 / footprint, 1 / footprint, 1 / footprint);
  }
  return { parts, aspect: size.y / footprint };
}

/**
 * One instanced mesh per part of the model, placed at `items`.
 *
 * An item is scaled uniformly — a decoration squashed on one axis stops
 * reading as the thing it is — and says which dimension it is scaled BY:
 *
 *   `size`   the width its footprint should end up. Right for anything with a
 *            collision box, since the box is a footprint.
 *   `height` how tall it should stand. Right for anything you judge by height
 *            rather than width, which is every tree: the models are authored
 *            at wildly different proportions, and an oak sized by its footprint
 *            comes out twice as tall as the same number in a spire.
 *
 * @returns {import('three').InstancedMesh[]} empty when the model is absent
 */
export function instancedModel(model, items) {
  const { parts, aspect } = normalisedParts(model);
  if (parts.length === 0 || items.length === 0) return [];

  const scaled = items.map((item) => {
    const scale = item.height === undefined ? item.size : item.height / aspect;
    return {
      x: item.x,
      y: item.y ?? 0,
      z: item.z,
      rotationY: item.rotationY ?? 0,
      sx: scale,
      sy: scale,
      sz: scale,
    };
  });

  return parts.map((part) => {
    const mesh = tiledInstances(part.geometry, part.material, scaled);
    mesh.receiveShadow = false;
    return mesh;
  });
}
