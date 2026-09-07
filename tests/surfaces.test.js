import { describe, expect, it } from 'vitest';
import { BOOST_PAD, PADDOCK_HALF, SURFACE, WORLD, blockCentre } from '../src/config/world.js';
import { createSurfaceSampler } from '../src/world/surfaces.js';
import { paddockBlockKeys } from '../src/world/landmarks.js';
import { buildPuddles } from '../src/world/puddles.js';
import { LANDMARKS } from '../src/content/resume.js';
import { distanceAcrossTrack, trackOffsetAt } from '../src/world/track.js';

const puddles = buildPuddles();
const surfaceAt = createSurfaceSampler(paddockBlockKeys, puddles);

/**
 * The surface lookup replaced a rasterised bitmap with arithmetic. These tests
 * are what make that swap safe: they pin the behaviour at every boundary the
 * old bitmap encoded implicitly.
 *
 * Nothing here may assume the track is straight. It is a sine with a period of
 * one block, so every sample has to be taken relative to trackOffsetAt — which
 * is exactly the mistake this suite exists to catch.
 */
describe('surface sampling', () => {
  it('finds the nearest track line, including across the seam', () => {
    expect(distanceAcrossTrack(trackOffsetAt(0), 0)).toBeCloseTo(0, 9);
    expect(distanceAcrossTrack(WORLD.BLOCK + trackOffsetAt(77), 77)).toBeCloseTo(0, 9);
    expect(distanceAcrossTrack(20 + trackOffsetAt(77), 77)).toBeCloseTo(20, 9);
    expect(distanceAcrossTrack(WORLD.SIZE - 20 + trackOffsetAt(77), 77)).toBeCloseTo(20, 9);
  });

  it('classifies the track, its verge and the ground beyond', () => {
    // On a track, but away from the block midpoint where a boost pad sits.
    const along = blockCentre(2) + 120;
    const centre = WORLD.BLOCK + trackOffsetAt(along);

    expect(surfaceAt(centre, along)).toBe(SURFACE.TRACK);
    expect(surfaceAt(centre + WORLD.ROAD_HALF - 1, along)).toBe(SURFACE.TRACK);
    expect(surfaceAt(centre + WORLD.ROAD_HALF + 1, along)).toBe(SURFACE.VERGE);
    expect(surfaceAt(centre + WORLD.ROAD_HALF + WORLD.WALK + 1, along)).not.toBe(SURFACE.VERGE);
  });

  it('follows the track where it has wandered away from its grid line', () => {
    // A quarter of a block along, the wobble is at its widest.
    const along = WORLD.BLOCK / 4;
    const offset = trackOffsetAt(along);
    expect(Math.abs(offset)).toBeGreaterThan(50);

    expect(surfaceAt(WORLD.BLOCK + offset, along)).toBe(SURFACE.TRACK);
    // The grid line itself is now well off the dirt.
    expect(surfaceAt(WORLD.BLOCK, along)).not.toBe(SURFACE.TRACK);
  });

  it('puts boost pads at the middle of each track segment', () => {
    const line = WORLD.BLOCK;
    const middle = blockCentre(1);
    // The wobble is zero at a block midpoint, so the pad is square on the line.
    expect(trackOffsetAt(middle)).toBeCloseTo(0, 9);
    expect(surfaceAt(line, middle)).toBe(SURFACE.BOOST);

    const past = middle + BOOST_PAD.HALF_ALONG + 4;
    expect(surfaceAt(line + trackOffsetAt(past), past)).toBe(SURFACE.TRACK);
  });

  it('packs landmark blocks and leaves ordinary blocks rough', () => {
    expect(surfaceAt(256, 256)).toBe(SURFACE.PADDOCK); // the lookout tower's block
    expect(surfaceAt(768, 1792)).toBe(SURFACE.FIELD); // an ordinary block
  });

  it('ends the paddock where the painted one ends, not at the block edge', () => {
    // The paddock is the square the renderer paints and the terrain flattens.
    // Past its edge a landmark block is open hillside and has to grip like it:
    // reporting PADDOCK out here gave a third of every landmark block the grip
    // of packed dirt while looking, and being driven over, as a grass bank.
    const [landmark] = LANDMARKS;
    expect(surfaceAt(landmark.x + PADDOCK_HALF - 1, landmark.z)).toBe(SURFACE.PADDOCK);
    expect(surfaceAt(landmark.x, landmark.z - PADDOCK_HALF + 1)).toBe(SURFACE.PADDOCK);

    // Sweep the whole block. Beyond the square the ground is track, verge or
    // open field depending on where the track has wandered — but never packed.
    let fieldBeyond = 0;
    for (let dx = -250; dx <= 250; dx += 5) {
      for (let dz = -250; dz <= 250; dz += 5) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) <= PADDOCK_HALF) continue;
        const surface = surfaceAt(landmark.x + dx, landmark.z + dz);
        expect(surface, `at ${dx},${dz} from the landmark`).not.toBe(SURFACE.PADDOCK);
        if (surface === SURFACE.FIELD) fieldBeyond += 1;
      }
    }
    // And that ground is real: where the track has swung away from the block
    // there is open hillside between the paddock and the verge.
    expect(fieldBeyond).toBeGreaterThan(0);
  });

  it('reports mud in a puddle and only in a puddle', () => {
    const puddle = puddles[0];
    expect(surfaceAt(puddle.x, puddle.z)).toBe(SURFACE.MUD);
    expect(surfaceAt(puddle.x, puddle.z + puddle.radius + 6)).not.toBe(SURFACE.MUD);
  });

  it('never reports mud on the track or its verge', () => {
    for (let along = 0; along < WORLD.SIZE; along += 3) {
      for (let g = 0; g < WORLD.GRID; g += 1) {
        const centre = g * WORLD.BLOCK + trackOffsetAt(along);
        for (const offset of [-WORLD.ROAD_HALF, 0, WORLD.ROAD_HALF]) {
          expect(surfaceAt(centre + offset, along)).not.toBe(SURFACE.MUD);
          expect(surfaceAt(along, centre + offset)).not.toBe(SURFACE.MUD);
        }
      }
    }
  });

  it('gives the same answer either side of the world seam', () => {
    for (let offset = -2; offset <= 2; offset += 1) {
      expect(surfaceAt(offset, 300)).toBe(surfaceAt(offset + WORLD.SIZE, 300));
    }
  });
});
