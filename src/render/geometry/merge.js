import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Merges geometries that were not built the same way.
 *
 * three's merge refuses a mix of indexed and non-indexed inputs, and the
 * primitives here are exactly such a mix — CylinderGeometry is indexed,
 * IcosahedronGeometry is not. Worse, it signals the refusal by logging and
 * returning null, which surfaces hundreds of lines later as a null dereference
 * deep inside the renderer. So: normalise first, and throw at the point of the
 * mistake if anything else is wrong.
 *
 * Expanding to non-indexed is the right normalisation for this project anyway.
 * Everything merged here is flat-shaded low-poly, which wants per-face normals,
 * and the geometries are small and built once.
 */
export function mergeParts(geometries, label = 'geometry') {
  if (geometries.length === 0) throw new Error(`mergeParts(${label}): nothing to merge`);

  const normalised = geometries.map((geometry) =>
    geometry.index ? geometry.toNonIndexed() : geometry,
  );

  const merged = mergeGeometries(normalised, false);
  if (!merged) {
    throw new Error(
      `mergeParts(${label}): three refused the merge — the parts have different attributes. ` +
        `Attribute sets: ${normalised.map((g) => Object.keys(g.attributes).join('+')).join(' | ')}`,
    );
  }
  return merged;
}
