import { describe, expect, it } from 'vitest';
import { BOOST_PAD, SURFACE, WORLD, blockCentre } from '../src/config/world.js';
import { createSurfaceSampler, distanceToRoadLine } from '../src/world/surfaces.js';
import { plazaBlockKeys } from '../src/world/landmarks.js';

const surfaceAt = createSurfaceSampler(plazaBlockKeys);

/**
 * The surface lookup replaced a rasterised bitmap with arithmetic. These tests
 * are what make that swap safe: they pin the behaviour at every boundary the
 * old bitmap encoded implicitly.
 */
describe('surface sampling', () => {
  it('finds the nearest road line, including across the seam', () => {
    expect(distanceToRoadLine(0)).toBe(0);
    expect(distanceToRoadLine(WORLD.BLOCK)).toBe(0);
    expect(distanceToRoadLine(20)).toBe(20);
    expect(distanceToRoadLine(WORLD.SIZE - 20)).toBe(20);
  });

  it('classifies the road, its kerb and the ground beyond', () => {
    const line = WORLD.BLOCK;
    // On a road, but away from the block midpoint where a boost pad sits.
    const plainAsphalt = blockCentre(2) + 120;

    expect(surfaceAt(line, plainAsphalt)).toBe(SURFACE.ROAD);
    expect(surfaceAt(line + WORLD.ROAD_HALF - 1, plainAsphalt)).toBe(SURFACE.ROAD);
    expect(surfaceAt(line + WORLD.ROAD_HALF + 1, plainAsphalt)).toBe(SURFACE.WALK);
    expect(surfaceAt(line + WORLD.ROAD_HALF + WORLD.WALK + 1, plainAsphalt)).not.toBe(SURFACE.WALK);
  });

  it('puts boost pads at the middle of each block segment', () => {
    const line = WORLD.BLOCK;
    const middle = blockCentre(1);
    expect(surfaceAt(line, middle)).toBe(SURFACE.BOOST);
    // Just past the pad's end it is ordinary asphalt again.
    expect(surfaceAt(line, middle + BOOST_PAD.HALF_ALONG + 4)).toBe(SURFACE.ROAD);
  });

  it('paves landmark blocks and leaves ordinary blocks rough', () => {
    expect(surfaceAt(256, 256)).toBe(SURFACE.PLAZA); // the office tower's block
    expect(surfaceAt(768, 1792)).toBe(SURFACE.GRASS); // an ordinary block
  });

  it('gives the same answer either side of the world seam', () => {
    for (let offset = -2; offset <= 2; offset += 1) {
      expect(surfaceAt(offset, 300)).toBe(surfaceAt(offset + WORLD.SIZE, 300));
    }
  });
});
