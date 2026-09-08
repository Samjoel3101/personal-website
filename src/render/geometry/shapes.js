import { Box3, Color, Float32BufferAttribute, Vector3 } from 'three';
import { hash2 } from '../../core/noise.js';
import { mergeParts } from './merge.js';

/**
 * The vocabulary every plant, rock and log is written in.
 *
 * Two rules hold across all of them, and both exist so the renderer can treat
 * a cactus and a pine identically.
 *
 * Every finished shape is normalised to **one unit tall, centred on x and z,
 * with its base at y = 0**. An instance is then placed with a single uniform
 * scale equal to the height the world model asked for. Uniform, because a
 * plant squashed on one axis stops reading as the thing it is.
 *
 * And every shape carries its own colours in a `color` attribute rather than
 * in a material. That is what lets a whole species — trunk, canopy, the pale
 * underside of a frond — be drawn in one instanced draw call, and it composes
 * with the per-instance tint, which multiplies on top of it.
 */

/** Attaches a flat colour to a geometry as a vertex attribute. */
export function paint(geometry, hex) {
  const colour = new Color(hex);
  const count = geometry.getAttribute('position').count;
  const values = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    values[i * 3] = colour.r;
    values[i * 3 + 1] = colour.g;
    values[i * 3 + 2] = colour.b;
  }
  geometry.setAttribute('color', new Float32BufferAttribute(values, 3));
  return geometry;
}

/**
 * One coloured, positioned piece of a shape.
 *
 * @param {import('three').BufferGeometry} geometry
 * @param {string} hex
 * @param {{x?: number, y?: number, z?: number, tilt?: number, spin?: number,
 *   lean?: number, scale?: [number, number, number]}} [placement]
 */
export function part(geometry, hex, placement = {}) {
  const { x = 0, y = 0, z = 0, tilt = 0, spin = 0, lean = 0, scale } = placement;
  if (scale) geometry.scale(scale[0], scale[1], scale[2]);
  if (tilt) geometry.rotateX(tilt);
  if (lean) geometry.rotateZ(lean);
  if (spin) geometry.rotateY(spin);
  geometry.translate(x, y, z);
  return paint(geometry, hex);
}

/**
 * Merges the parts of a shape and normalises it onto the unit contract above.
 *
 * The normals are recomputed after the merge, on non-indexed geometry, which
 * is what gives every facet a hard edge — the whole look depends on it.
 */
export function finish(parts, label) {
  const geometry = mergeParts(parts, label);
  geometry.computeVertexNormals();

  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox ?? new Box3();
  const centre = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  geometry.translate(-centre.x, -bounds.min.y, -centre.z);
  geometry.scale(1 / (size.y || 1), 1 / (size.y || 1), 1 / (size.y || 1));
  return geometry;
}

/**
 * Pushes every vertex out along its own direction by a deterministic amount.
 *
 * A rock is an icosahedron until you do this to it. Seeded by the rounded
 * vertex position so the same shape comes out of the same call every time —
 * and so the two sides of a shared edge move together instead of tearing the
 * surface open.
 */
export function roughen(geometry, amount, seed = 1) {
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const jitter =
      1 + (hash2(Math.round(x * 64), Math.round(y * 97 + z * 31), seed) - 0.5) * amount;
    position.setXYZ(i, x * jitter, y * jitter, z * jitter);
  }
  position.needsUpdate = true;
  return geometry;
}
