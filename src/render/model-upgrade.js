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
  // Present on a minority of the forest-floor-detail kit's materials — see
  // the note on `hasRealColour` below for why it is carried conditionally.
  ['color', 3],
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

/**
 * Whether `COLOR_0` is carrying real hue rather than an ambient-occlusion
 * ramp, on a material with no diffuse colour of its own.
 *
 * Most of the pack's `COLOR_0` data is exactly what the note above `flatten`
 * describes for Kenney's kits: a greyscale shading ramp riding on top of a
 * material that already has its own tinted `baseColorFactor`, safe to drop.
 * But a few of the forest-floor-detail kit's materials — `sedge-tussock`'s
 * `sedge_core`/`sedge_blade`/`sedge_tip` among them — shipped with
 * `baseColorFactor` left at the glTF default (opaque white) and their actual
 * authored colour living entirely in `COLOR_0`. Dropping it the way a shaded
 * material's ramp is dropped renders the whole mesh flat white, silently —
 * the same trap materials.js documents for `vertexColors`, in the opposite
 * direction: here a colour attribute exists and gets ignored.
 *
 * Detected by the material colour being left at the unset default: a real
 * white material would be deliberately authored, but nothing in this kit or
 * Kenney's ever sets `color: '#ffffff'` on purpose.
 */
function hasRealColour(material, geometry) {
  if (!geometry.getAttribute('color')) return false;
  const { r, g, b } = material.color ?? {};
  return r === 1 && g === 1 && b === 1;
}

function flatten(material, geometry) {
  if (!material || material.isMeshLambertMaterial) return material;
  if (flattened.has(material)) return flattened.get(material);

  const tint = KIT_TINTS[material.name];
  // A material whose real colour lives in COLOR_0 (see hasRealColour) is
  // treated exactly like a procedural shape: white base, vertex colour
  // carries the hue, and the instance tint still multiplies through it.
  const vertexColours = !tint && hasRealColour(material, geometry);
  const color = tint
    ? new Color(tint)
    : vertexColours
      ? new Color(0xffffff)
      : (material.color?.clone() ?? new Color(0xffffff));

  const lambert = new MeshLambertMaterial({
    color,
    map: material.map ?? null,
    transparent: material.transparent,
    opacity: material.opacity,
    alphaTest: material.alphaTest,
    side: material.side,
    // The instance tint multiplies through vertexColors on procedural shapes;
    // a kit model normally has no meaningful colour attribute, so its tint
    // arrives as instance colour alone and vertexColors stays off — except
    // the rare material above, which needs it on to have any colour at all.
    // See ./materials.js.
    vertexColors: vertexColours,
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
    const material = flatten(child.material, geometry);
    geometry.applyMatrix4(child.matrixWorld);
    parts.push({ geometry, material });
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
