import { Box3, Color, Float32BufferAttribute, MeshLambertMaterial, Vector3 } from 'three';
import { KIT_TINTS } from '../config/palette.js';
import { createBarkTexture, createFoliageTexture } from './textures/foliage.js';
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

/**
 * Which downloaded materials get drawn detail on top of their flat colour.
 *
 * Keyed by glTF material name, the same names KIT_TINTS repaints. The kits
 * ship no texture at all for these surfaces — a canopy is one flat green — so
 * this is where a tree stops being a silhouette and starts having leaves.
 */
const KIT_SURFACES = Object.freeze({
  grass: 'foliage',
  leafsGreen: 'foliage',
  leafsDark: 'foliage',
  woodBark: 'bark',
  woodBarkDark: 'bark',
  wood: 'bark',
  woodDark: 'bark',
});

/** Built on first use: these draw to a canvas, so they need a document. */
const drawn = new Map();

function detailFor(kind) {
  if (!drawn.has(kind)) {
    drawn.set(kind, kind === 'bark' ? createBarkTexture() : createFoliageTexture());
  }
  return drawn.get(kind);
}

/** Repeats of the detail texture across one unit of the normalised model. */
const DETAIL_REPEATS = 2.5;

/**
 * Replaces a model's own UVs with a box projection.
 *
 * The kits' UVs address a swatch in a colour atlas — every vertex of a canopy
 * points at the same few pixels of flat green. Tiling a detail texture through
 * them samples that one spot and changes nothing, so the coordinates have to
 * be generated. Projecting along whichever axis a face points down means no
 * face gets stretched to a smear, which one flat projection would do to every
 * vertical surface on the model.
 */
function projectUvs(geometry) {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  if (!position) return;

  const uvs = new Float32Array(position.count * 2);

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);

    const nx = normal ? Math.abs(normal.getX(i)) : 0;
    const ny = normal ? Math.abs(normal.getY(i)) : 1;
    const nz = normal ? Math.abs(normal.getZ(i)) : 0;

    let u = x;
    let v = y;
    if (ny >= nx && ny >= nz) v = z;
    else if (nx >= nz) u = z;

    uvs[i * 2] = u * DETAIL_REPEATS;
    uvs[i * 2 + 1] = v * DETAIL_REPEATS;
  }

  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
}

function flatten(material) {
  if (!material || material.isMeshLambertMaterial) return material;
  if (flattened.has(material)) return flattened.get(material);

  const tint = KIT_TINTS[material.name];
  const surface = KIT_SURFACES[material.name];
  const lambert = new MeshLambertMaterial({
    color: tint ? new Color(tint) : (material.color?.clone() ?? 0xffffff),
    map: material.map ?? (surface ? detailFor(surface) : null),
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
 * Copies an attribute into a plain, non-normalised Float32 array.
 *
 * `KHR_mesh_quantization` — which the Meshopt-compressed kits all use — hands
 * `GLTFLoader` a POSITION attribute of normalised int16s with the real scale in
 * the node matrix. `BufferGeometry.applyMatrix4` writes transformed values
 * straight back through that normalisation, so any coordinate the node matrix
 * pushes past the model's own extent wraps the int16 and the mesh detonates
 * into spikes. Baking to float first is the fix, and it is a no-op on the
 * unquantised kits.
 */
function toFloatAttribute(attribute) {
  if (attribute.array instanceof Float32Array && !attribute.normalized) return attribute;
  const out = new Float32Array(attribute.count * attribute.itemSize);
  for (let i = 0; i < attribute.count; i += 1) {
    for (let k = 0; k < attribute.itemSize; k += 1) {
      out[i * attribute.itemSize + k] = attribute.getComponent(i, k);
    }
  }
  return new Float32BufferAttribute(out, attribute.itemSize);
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
    for (const name of ['position', 'normal']) {
      if (geometry.getAttribute(name)) {
        geometry.setAttribute(name, toFloatAttribute(geometry.getAttribute(name)));
      }
    }
    geometry.applyMatrix4(child.matrixWorld);
    const material = flatten(child.material);
    parts.push({ geometry, material, projected: KIT_SURFACES[child.material?.name] !== undefined });
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
    // After normalising, so the detail is the same size on every model
    // whatever scale it was authored at.
    if (part.projected) projectUvs(part.geometry);
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
