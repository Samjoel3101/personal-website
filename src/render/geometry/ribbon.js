import { BufferGeometry, Float32BufferAttribute } from 'three';
import { WORLD } from '../../config/world.js';
import { trackOffsetAt } from '../../world/track.js';

/**
 * A flat strip that follows a track line.
 *
 * Every ground layer that used to be one long quad down a grid line is now one
 * of these: the track wanders, so a straight quad would leave the dirt behind
 * within a quarter of a block. Sampling the same trackOffsetAt the physics
 * reads is what keeps the surface you can see and the surface you can feel the
 * same surface.
 *
 * The strip's half-width is measured ACROSS the axis, not perpendicular to the
 * curve — which matches distanceAcrossTrack exactly. A perpendicular offset
 * would look marginally better on the diagonals and disagree with the physics
 * by up to a fifth of the width, which is much worse.
 */

/** 16 world units per segment, matching the terrain's facet size. */
export const RIBBON_SEGMENTS = WORLD.SIZE / 16;

/**
 * @param {object} spec
 * @param {number} spec.line   the grid line this track nominally follows
 * @param {'x'|'z'} spec.axis  the axis the track runs down
 * @param {number} spec.halfWidth
 * @param {number} spec.y      which rung of GROUND_LAYER this sits on
 * @param {number} [spec.from] start of the strip along the axis
 * @param {number} [spec.to]   end of it
 * @param {number} [spec.lateral] shift of the whole strip off the centre line
 */
export function trackRibbon({
  line,
  axis,
  halfWidth,
  y,
  from = 0,
  to = WORLD.SIZE,
  lateral = 0,
  segments = RIBBON_SEGMENTS,
}) {
  const positions = [];
  const step = (to - from) / segments;
  const alongZ = axis === 'z';

  for (let i = 0; i < segments; i += 1) {
    const a0 = from + i * step;
    const a1 = a0 + step;
    const c0 = line + trackOffsetAt(a0) + lateral;
    const c1 = line + trackOffsetAt(a1) + lateral;

    // Corners named for the canonical (along, across) frame.
    const near0 = point(alongZ, a0, c0 - halfWidth, y);
    const far0 = point(alongZ, a1, c1 - halfWidth, y);
    const far1 = point(alongZ, a1, c1 + halfWidth, y);
    const near1 = point(alongZ, a0, c0 + halfWidth, y);

    // Wound so the face normal is +Y. Swapping the axes mirrors the quad, so
    // the x-axis strips have to be wound the other way or they cull away.
    const quad = alongZ
      ? [near0, far0, far1, near0, far1, near1]
      : [near0, far1, far0, near0, near1, far1];
    for (const vertex of quad) positions.push(...vertex);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  const normals = new Float32Array(positions.length);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  return geometry;
}

/** Maps (along, across) into world (x, y, z) for whichever axis is the track. */
function point(alongZ, along, across, y) {
  return alongZ ? [across, y, along] : [along, y, across];
}

/** One ribbon per track line in both axes, for a layer that runs everywhere. */
export function everyTrackRibbon(spec) {
  const parts = [];
  for (let g = 0; g < WORLD.GRID; g += 1) {
    const line = g * WORLD.BLOCK;
    parts.push(trackRibbon({ ...spec, line, axis: 'z' }));
    parts.push(trackRibbon({ ...spec, line, axis: 'x' }));
  }
  return parts;
}
