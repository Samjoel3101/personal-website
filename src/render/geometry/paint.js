import { Color, Float32BufferAttribute } from 'three';

/**
 * Bakes a flat colour into a geometry's vertex colours.
 *
 * This is how a tree ends up with a brown trunk and green foliage while still
 * being one merged geometry and therefore one instanced draw call. Merging
 * geometries that carry different materials is impossible; merging geometries
 * that carry different vertex colours is trivial.
 */
export function paintGeometry(geometry, hex) {
  const colour = new Color(hex);
  const count = geometry.attributes.position.count;
  const colours = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    colours[i * 3] = colour.r;
    colours[i * 3 + 1] = colour.g;
    colours[i * 3 + 2] = colour.b;
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
  return geometry;
}
