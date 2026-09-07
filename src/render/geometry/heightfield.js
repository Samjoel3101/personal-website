import { BufferGeometry, Color, Float32BufferAttribute, Uint32BufferAttribute } from 'three';

/**
 * A displaced, vertex-coloured grid over one world tile.
 *
 * Indexed, with normals and colour taken from the field itself rather than
 * from each triangle. The earlier version was non-indexed with per-face
 * normals and per-face colour, which gave every one of its 33,000 facets a
 * hard edge and a flat tone — chunky up close, and a mess of shimmering plates
 * at any distance. Sampling per lattice vertex costs a quarter as many
 * vertices, and shades the hillside as the one continuous surface it is.
 *
 * The cell split runs (x0, z0) → (x1, z1). `latticeHeightAt` in
 * src/world/terrain.js reproduces that split to tell the rest of the renderer
 * where this surface is between its lattice lines; change the diagonal here
 * and it has to change there too.
 *
 * One tile only. The caller instances it across the 3x3 tiling, so the whole
 * heightfield is a single geometry and a single draw call however many
 * triangles it carries — see src/render/geometry/tiling.js.
 */
export function buildHeightfield({ size, cells, sample, normal, tint }) {
  const step = size / cells;
  const across = cells + 1;
  const count = across * across;

  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  const colour = new Color();

  for (let j = 0; j < across; j += 1) {
    const z = j * step;
    for (let i = 0; i < across; i += 1) {
      const x = i * step;
      const y = sample(x, z);
      const cursor = (j * across + i) * 3;

      positions[cursor] = x;
      positions[cursor + 1] = y;
      positions[cursor + 2] = z;

      const up = normal(x, z);
      normals[cursor] = up.x;
      normals[cursor + 1] = up.y;
      normals[cursor + 2] = up.z;

      colour.set(tint({ x, y, z }));
      colours[cursor] = colour.r;
      colours[cursor + 1] = colour.g;
      colours[cursor + 2] = colour.b;
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
  geometry.setIndex(buildIndex(cells, across));
  return geometry;
}

/** Two triangles per cell, wound counter-clockwise seen from above. */
function buildIndex(cells, across) {
  const indices = new Uint32Array(cells * cells * 6);
  let cursor = 0;

  for (let j = 0; j < cells; j += 1) {
    for (let i = 0; i < cells; i += 1) {
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

  // Uint32 rather than Uint16: 129x129 vertices fit in 16 bits today, but
  // raising CELLS would silently overflow them.
  return new Uint32BufferAttribute(indices, 1);
}
