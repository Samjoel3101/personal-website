import { describe, expect, it } from 'vitest';
import { WORLD } from '../src/config/world.js';
import { COMMUNITIES, COMMUNITY_IDS, patchAt, patchValue } from '../src/world/patches.js';

const sample = (step, visit) => {
  for (let z = 0; z < WORLD.LENGTH; z += step) {
    for (let x = -WORLD.HALF_WIDTH; x < WORLD.HALF_WIDTH; x += step) visit(x, z);
  }
};

const dominant = (weights) =>
  COMMUNITY_IDS.reduce((best, id) => (weights[id] > weights[best] ? id : best), COMMUNITY_IDS[0]);

/**
 * The communities are what turn an even sprinkle of every species into stands
 * — mats of clover, drifts of dry grass, fern banks. These are the properties
 * that has to hold to read as arrangement rather than as noise.
 */
describe('plant communities', () => {
  it('always sum to one', () => {
    sample(97, (x, z) => {
      const weights = patchAt(x, z);
      const total = COMMUNITY_IDS.reduce((sum, id) => sum + weights[id], 0);
      expect(total).toBeCloseTo(1, 8);
    });
  });

  it('give every community a real share of the valley', () => {
    const counts = Object.fromEntries(COMMUNITY_IDS.map((id) => [id, 0]));
    let cells = 0;
    sample(23, (x, z) => {
      counts[dominant(patchAt(x, z))] += 1;
      cells += 1;
    });

    for (const id of COMMUNITY_IDS) {
      const share = counts[id] / cells;
      expect(share, `community ${id}`).toBeGreaterThan(0.04);
      expect(share, `community ${id}`).toBeLessThan(0.4);
    }
  });

  it('grow in stands rather than in speckle', () => {
    // Walk a line and count how often the community underfoot changes. Stands
    // tens of metres across are the point; a change every few units would mean
    // the field had dissolved back into an even mixture.
    let changes = 0;
    let steps = 0;
    let previous = null;
    for (let z = 0; z < WORLD.LENGTH; z += 5) {
      const current = dominant(patchAt(0, z));
      if (previous !== null && current !== previous) changes += 1;
      previous = current;
      steps += 1;
    }
    expect((steps / Math.max(changes, 1)) * 5).toBeGreaterThan(40);
  });

  it('only neighbours in the square ever border each other', () => {
    // Nothing in a landscape goes straight from parched to deep shade, and
    // the two-axis layout is what enforces that. Any two communities blended
    // together at a point have to be close in that square.
    const far = COMMUNITIES.find((c) => c.id === 'dry');
    const wet = COMMUNITIES.find((c) => c.id === 'shade');
    expect(Math.hypot(far.damp - wet.damp, far.open - wet.open)).toBeGreaterThan(0.6);

    sample(31, (x, z) => {
      const weights = patchAt(x, z);
      expect(Math.min(weights.dry, weights.shade)).toBeLessThan(0.2);
    });
  });
});

describe('affinity tables', () => {
  it('redistribute a species rather than adding to it', () => {
    // The multiplier averages one across the valley, so an affinity
    // concentrates a species into its stands without planting more of it.
    // Every weight in src/config depends on this being true.
    const table = { shade: 1.7, clover: 0.5 };
    let sum = 0;
    let cells = 0;
    sample(17, (x, z) => {
      sum += patchValue(patchAt(x, z), table);
      cells += 1;
    });
    expect(sum / cells).toBeGreaterThan(0.75);
    expect(sum / cells).toBeLessThan(1.35);
  });

  it('concentrate where the table points', () => {
    const table = { dry: 2 };
    const inDrift = patchValue({ ...zeroes(), dry: 1 }, table);
    const elsewhere = patchValue({ ...zeroes(), shade: 1 }, table);
    expect(inDrift).toBeGreaterThan(5);
    expect(elsewhere).toBe(0);
  });

  it('leave a species alone when it names no table', () => {
    expect(patchValue(patchAt(0, 0), undefined)).toBe(1);
  });
});

const zeroes = () => Object.fromEntries(COMMUNITY_IDS.map((id) => [id, 0]));
