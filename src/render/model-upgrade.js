import {
  Box3,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  MeshLambertMaterial,
  Vector3,
} from 'three';
import { KIT_TINTS } from '../config/palette.js';

/**
 * Turns a fetched glTF into something the instanced planting can draw.
 *
 * Two jobs. It bakes each mesh's world transform into a copy of its geometry
 * and normalises the result onto the same contract every procedural shape
 * meets — one unit tall, centred on x and z, base at y = 0 — so a downloaded
 * pine drops into the same instancing path, at the same sizes, as the one it
 * replaces. And it flattens the materials.
 *
 * That second job is not cosmetic. A glTF arrives as MeshStandardMaterial,
 * roughly twice the fragment cost of the Lambert everything else uses and
 * visibly different beside it — and Kenney's untextured kits are authored
 * `metallicFactor: 1`. A fully metallic surface with no environment map to
 * reflect has nothing to return but black, so those models render as
 * silhouettes and look for all the world like a shader bug.
 *
 * Everything here must survive `model` being null. Assets are an upgrade,
 * never a dependency.
 */
const flattened = new Map();

/** The attributes worth carrying over from a fetched model. */
const ATTRIBUTES = [
  ['position', 3],
  ['normal', 3],
  ['uv', 2],
];

/**
 * Rebuilds a geometry with plain float attributes.
 *
 * The pack's models are quantised (`KHR_mesh_quantization`) and Meshopt-packed,
 * so their positions arrive as normalised 16-bit integers in an interleaved
 * buffer, with the node transform doing the de-quantisation. Baking that
 * transform into the geometry — which is how every model here gets placed —
 * then writes float world coordinates back into an int16 array, and what comes
 * out the other side is a tree the size of a valley with its normals inside
 * out. It took one look at a hundred-metre plank of bark to find.
 *
 * Reading through `getX`/`getY`/`getZ` denormalises properly, whatever the
 * source layout, and this runs once per model at load.
 */
function toFloatGeometry(source) {
  const geometry = new BufferGeometry();
  for (const [name, size] of ATTRIBUTES) {
    const attribute = source.getAttribute(name);
    if (!attribute) continue;

    const values = new Float32Array(attribute.count * size);
    for (let i = 0; i < attribute.count; i += 1) {
      values[i * size] = attribute.getX(i);
      values[i * size + 1] = attribute.getY(i);
      if (size > 2) values[i * size + 2] = attribute.getZ(i);
    }
    geometry.setAttribute(name, new Float32BufferAttribute(values, size));
  }
  if (source.index) geometry.setIndex(source.index.clone());
  return geometry;
}

function flatten(material) {
  if (!material || material.isMeshLambertMaterial) return material;
  if (flattened.has(material)) return flattened.get(material);

  const tint = KIT_TINTS[material.name];
  const lambert = new MeshLambertMaterial({
    color: tint ? new Color(tint) : (material.color?.clone() ?? new Color(0xffffff)),
    map: material.map ?? null,
    transparent: material.transparent,
    opacity: material.opacity,
    alphaTest: material.alphaTest,
    side: material.side,
    // The instance tint multiplies through vertexColors on procedural shapes;
    // a kit model has no colour attribute, so its tint arrives as instance
    // colour alone and vertexColors must stay off. See ./materials.js.
    vertexColors: false,
  });
  lambert.name = material.name;
  flattened.set(material, lambert);
  return lambert;
}

/**
 * @param {import('three').Object3D|null} model
 * @returns {{geometry, material}[]} one entry per mesh, empty if absent
 */
export function normalisedParts(model) {
  if (!model) return [];
  model.updateMatrixWorld(true);

  const parts = [];
  model.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const geometry = toFloatGeometry(child.geometry);
    geometry.applyMatrix4(child.matrixWorld);
    parts.push({ geometry, material: flatten(child.material) });
  });
  if (parts.length === 0) return [];

  const bounds = new Box3();
  for (const part of parts) {
    part.geometry.computeBoundingBox();
    bounds.union(part.geometry.boundingBox);
  }
  const centre = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());

  /*
   * Normalised by height, unless the model is a pancake.
   *
   * Every shape in this project is one unit tall and placed with a scale equal
   * to the height the world model asked for. That is the right contract for
   * anything that stands up — a tree, a cactus, a flower — and it is a trap for
   * anything that lies down. Kenney's large stone is four times wider than it
   * is tall, so scaling it to a twenty-unit "height" produces an eighty-unit
   * slab: from eye level, a white wall across the forest.
   *
   * So a model wider than this ratio is normalised by its footprint instead,
   * which keeps the number the world model chose meaning roughly "how big is
   * this thing" for both kinds.
   */
  const WIDEST = 1.8;
  const footprint = Math.max(size.x, size.z);
  const unit = Math.max(size.y || 1, footprint / WIDEST);

  for (const part of parts) {
    part.geometry.translate(-centre.x, -bounds.min.y, -centre.z);
    part.geometry.scale(1 / unit, 1 / unit, 1 / unit);
  }
  return parts;
}
