import { BufferGeometry, Color, Float32BufferAttribute, Uint32BufferAttribute } from 'three';

/**
 * The ground, built from a sampled height grid.
 *
 * Indexed, with normals and colour taken per lattice vertex rather than per
 * face. Per-face shading on a field this size gives every one of its forty
 * thousand facets a hard edge and a flat tone, which reads as a shimmering
 * mess of plates at any distance; sampling per vertex costs a quarter of the
 * vertices and shades the hillside as the one continuous surface it is. The
 * facets are still there — everything standing *on* the ground is flat-shaded,
 * and that is where the low-poly look lives.
 *
 * The cell is split (a, b, c) and (a, c, d) — the diagonal runs from (x0, z0)
 * to (x1, z1). `surfaceHeight` in src/world/terrain.js reproduces that split so
 * the planting can sit exactly on the drawn surface. Change the winding here
 * and it has to change there too, or every tree in the valley starts floating.
 */
export function buildHeightfield(grid, colourAt) {
  const { columns, rows, across, cell, minX, minZ, heights } = grid;
  const count = across * (rows + 1);

  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  const colour = new Color();

  for (let j = 0; j <= rows; j += 1) {
    for (let i = 0; i <= columns; i += 1) {
      const index = j * across + i;
      const x = minX + i * cell;
      const z = minZ + j * cell;
      const y = heights[index];

      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;

      // Central differences on the lattice itself, so the shading agrees with
      // the triangles rather than with the analytic field they approximate.
      const dx = sample(grid, i + 1, j) - sample(grid, i - 1, j);
      const dz = sample(grid, i, j + 1) - sample(grid, i, j - 1);
      const span = 2 * cell;
      const length = Math.hypot(dx, span, dz) || 1;
      normals[index * 3] = -dx / length;
      normals[index * 3 + 1] = span / length;
      normals[index * 3 + 2] = -dz / length;

      colour.set(colourAt(x, z, Math.hypot(dx / span, dz / span)));
      colours[index * 3] = colour.r;
      colours[index * 3 + 1] = colour.g;
      colours[index * 3 + 2] = colour.b;
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
  geometry.setIndex(buildIndex(columns, rows, across));
  geometry.computeBoundingSphere();
  return geometry;
}

function sample(grid, i, j) {
  const column = Math.min(Math.max(i, 0), grid.columns);
  const row = Math.min(Math.max(j, 0), grid.rows);
  return grid.heights[row * grid.across + column];
}

/** Two triangles per cell, wound counter-clockwise seen from above. */
function buildIndex(columns, rows, across) {
  const indices = new Uint32Array(columns * rows * 6);
  let cursor = 0;

  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < columns; i += 1) {
      const a = j * across + i; // (x0, z0)
      const b = (j + 1) * across + i; // (x0, z1)
      const c = (j + 1) * across + i + 1; // (x1, z1)
      const d = j * across + i + 1; // (x1, z0)

      indices[cursor] = a;
      indices[cursor + 1] = b;
      indices[cursor + 2] = c;
      indices[cursor + 3] = a;
      indices[cursor + 4] = c;
      indices[cursor + 5] = d;
      cursor += 6;
    }
  }
  // Uint32 rather than Uint16: 81 x 281 vertices fit in 16 bits today, but a
  // finer lattice would silently overflow them.
  return new Uint32BufferAttribute(indices, 1);
}
