import { describe, expect, it } from 'vitest';
import { TRACK, WORLD, blockCentre } from '../src/config/world.js';
import { wrapDelta } from '../src/core/torus.js';
import {
  distanceAcrossTrack,
  distanceToTrack,
  trackOffsetAt,
  trackSlopeAt,
} from '../src/world/track.js';

/**
 * The wobble is chosen so the track passes dead through every junction and
 * every boost pad without either being special-cased. These tests are what
 * stop someone "improving" the curve into one that does not.
 */
describe('track shape', () => {
  it('passes through every junction', () => {
    for (let g = 0; g < WORLD.GRID; g += 1) {
      expect(trackOffsetAt(g * WORLD.BLOCK)).toBeCloseTo(0, 9);
    }
  });

  it('passes through every block midpoint, where the boost pads sit', () => {
    for (let segment = 0; segment < WORLD.GRID; segment += 1) {
      expect(trackOffsetAt(blockCentre(segment))).toBeCloseTo(0, 9);
    }
  });

  it('never wanders further than the wobble allows', () => {
    for (let along = 0; along < WORLD.SIZE; along += 0.5) {
      expect(Math.abs(trackOffsetAt(along))).toBeLessThanOrEqual(TRACK.WOBBLE);
    }
  });

  it('is continuous across the seam', () => {
    for (let along = -40; along <= 40; along += 1) {
      expect(trackOffsetAt(along + WORLD.SIZE)).toBeCloseTo(trackOffsetAt(along), 9);
    }
  });

  it('reports a slope that matches its own offset', () => {
    const EPSILON = 0.01;
    for (const along of [0, 63, 128, 256, 511, 1234]) {
      const numeric =
        (trackOffsetAt(along + EPSILON) - trackOffsetAt(along - EPSILON)) / (2 * EPSILON);
      expect(trackSlopeAt(along)).toBeCloseTo(numeric, 4);
    }
  });
});

describe('distance to the track', () => {
  it('is zero on the centre line, wherever the line has wandered to', () => {
    for (let along = 0; along < WORLD.SIZE; along += 7) {
      for (let g = 0; g < WORLD.GRID; g += 1) {
        const centre = g * WORLD.BLOCK + trackOffsetAt(along);
        expect(distanceAcrossTrack(centre, along)).toBeCloseTo(0, 9);
      }
    }
  });

  it('agrees with a brute-force search over every track line', () => {
    for (let i = 0; i < 400; i += 1) {
      const x = (i * 173.7) % WORLD.SIZE;
      const z = (i * 91.3) % WORLD.SIZE;

      let best = Infinity;
      for (let g = 0; g < WORLD.GRID; g += 1) {
        best = Math.min(best, Math.abs(wrapDelta(x - (g * WORLD.BLOCK + trackOffsetAt(z)))));
        best = Math.min(best, Math.abs(wrapDelta(z - (g * WORLD.BLOCK + trackOffsetAt(x)))));
      }
      expect(distanceToTrack(x, z)).toBeCloseTo(best, 9);
    }
  });

  it('never exceeds half a block', () => {
    for (let x = 0; x < WORLD.SIZE; x += 13) {
      for (let z = 0; z < WORLD.SIZE; z += 13) {
        expect(distanceToTrack(x, z)).toBeLessThanOrEqual(WORLD.BLOCK / 2 + 1e-9);
      }
    }
  });

  it('gives the same answer either side of the seam', () => {
    for (let offset = -3; offset <= 3; offset += 1) {
      expect(distanceToTrack(offset + WORLD.SIZE, 300)).toBeCloseTo(
        distanceToTrack(offset, 300),
        9,
      );
      expect(distanceToTrack(300, offset + WORLD.SIZE)).toBeCloseTo(
        distanceToTrack(300, offset),
        9,
      );
    }
  });
});
