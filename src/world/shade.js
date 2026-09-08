import { WORLD } from '../config/world.js';
import { clamp } from '../core/math.js';

/**
 * How much canopy stands over each part of the valley.
 *
 * Built from the trees once they are planted, and read by the undergrowth pass
 * that follows. It is what puts ferns and mushrooms under the trees and dry
 * grass out in the open, and both of those are arrangements a viewer reads
 * immediately as a real place: things growing where they would grow.
 *
 * A coarse grid rather than a query against the trees themselves. Ground cover
 * asks this question a hundred thousand times, and a nearest-tree search would
 * dominate the whole build; splatting four thousand trees into a lattice once
 * costs a few milliseconds and answers in two multiplications.
 */
const CELL = 24;
/** Canopy within this many multiples of a tree's height counts as its shade. */
const REACH = 0.55;
/**
 * Accumulated canopy that counts as full shade.
 *
 * Low, because the falloff means even a cell directly under two crowns rarely
 * totals much more than one: calibrated so the deep forest averages about a
 * half and a stand of trees reads as fully shaded, which is what the
 * undergrowth's `shade` preference is scaled against.
 */
const FULL = 0.9;

export function buildShade(canopy) {
  const columns = Math.ceil(WORLD.WIDTH / CELL) + 1;
  const rows = Math.ceil(WORLD.LENGTH / CELL) + 1;
  const values = new Float32Array(columns * rows);

  for (const items of canopy.values()) {
    for (const item of items) {
      splat(values, columns, rows, item);
    }
  }

  for (let i = 0; i < values.length; i += 1) values[i] = clamp(values[i] / FULL, 0, 1);
  return { columns, rows, cell: CELL, values };
}

/** Adds one tree's canopy to every cell it reaches, falling off from its trunk. */
function splat(values, columns, rows, item) {
  const radius = item.height * REACH;
  if (radius <= 0) return;

  const cx = (item.x + WORLD.HALF_WIDTH) / CELL;
  const cz = item.z / CELL;
  const span = Math.ceil(radius / CELL);

  for (
    let j = Math.max(0, Math.floor(cz) - span);
    j <= Math.min(rows - 1, Math.ceil(cz) + span);
    j += 1
  ) {
    for (
      let i = Math.max(0, Math.floor(cx) - span);
      i <= Math.min(columns - 1, Math.ceil(cx) + span);
      i += 1
    ) {
      const distance = Math.hypot((i - cx) * CELL, (j - cz) * CELL);
      if (distance < radius) values[j * columns + i] += 1 - distance / radius;
    }
  }
}

/** Canopy cover at a point, 0 in the open and 1 under a stand of trees. */
export function shadeAt(shade, x, z) {
  const i = Math.round((x + WORLD.HALF_WIDTH) / shade.cell);
  const j = Math.round(z / shade.cell);
  if (i < 0 || j < 0 || i >= shade.columns || j >= shade.rows) return 0;
  return shade.values[j * shade.columns + i];
}
