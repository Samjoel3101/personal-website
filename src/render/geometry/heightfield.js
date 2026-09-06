import { BufferGeometry, Color, Float32BufferAttribute } from 'three';

/**
 * A displaced, vertex-coloured grid over one world tile.
 *
 * Built non-indexed and left with per-face normals on purpose: the facets are
 * the look. Smoothing them turns a chunky rally hillside into a soft dune and
 * loses every read the low sun gives the terrain.
 *
 * One tile only. The caller instances it across the 3x3 tiling, so the whole
 * heightfield is a single geometry and a single draw call however many
 * triangles it carries — see src/render/geometry/tiling.js.
 *
 * `tint` is called once per triangle with its centroid, so the colour bands
 * follow the facets rather than being interpolated across them.
 */
export function buildHeightfield({ size, cells, sample, tint }) {
  const step = size / cells;
  const vertexCount = cells * cells * 6;
  const positions = new Float32Array(vertexCount * 3);
  const colours = new Float32Array(vertexCount * 3);
  const colour = new Color();

  // One row of heights is reused as the next row's top edge, which halves the
  // sample count. `sample` is cheap but it is called ~33k times either way.
  let top = sampleRow(sample, 0, cells, step);
  let cursor = 0;

  for (let j = 0; j < cells; j += 1) {
    const z0 = j * step;
    const z1 = z0 + step;
    const bottom = sampleRow(sample, z1, cells, step);

    for (let i = 0; i < cells; i += 1) {
      const x0 = i * step;
      const x1 = x0 + step;
      const corners = [
        [x0, top[i], z0],
        [x0, bottom[i], z1],
        [x1, bottom[i + 1], z1],
        [x1, top[i + 1], z0],
      ];

      // Two triangles, wound counter-clockwise when seen from above.
      for (const [a, b, c] of [
        [0, 1, 2],
        [0, 2, 3],
      ]) {
        const face = [corners[a], corners[b], corners[c]];
        colour.set(tint(faceCentre(face)));
        for (const [x, y, z] of face) {
          positions[cursor] = x;
          positions[cursor + 1] = y;
          positions[cursor + 2] = z;
          colours[cursor] = colour.r;
          colours[cursor + 1] = colour.g;
          colours[cursor + 2] = colour.b;
          cursor += 3;
        }
      }
    }

    top = bottom;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Heights along one row of lattice lines, `cells + 1` of them. */
function sampleRow(sample, z, cells, step) {
  const row = new Float32Array(cells + 1);
  for (let i = 0; i <= cells; i += 1) row[i] = sample(i * step, z);
  return row;
}

function faceCentre([a, b, c]) {
  return {
    x: (a[0] + b[0] + c[0]) / 3,
    y: (a[1] + b[1] + c[1]) / 3,
    z: (a[2] + b[2] + c[2]) / 3,
  };
}
