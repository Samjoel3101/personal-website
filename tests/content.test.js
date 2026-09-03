import { describe, expect, it } from 'vitest';
import { LANDMARKS, OWNER } from '../src/content/resume.js';
import { validateContent, validateLandmark, validateOwner } from '../src/content/schema.js';

/**
 * The resume is edited by hand, and the failure mode of a bad edit — a landmark
 * nudged off a block centre and buried inside a building — is invisible until
 * someone drives into that corner of the city. Catching it here is far cheaper
 * than catching it by playing.
 */
describe('resume content', () => {
  it('is valid', () => {
    expect(validateContent(OWNER, LANDMARKS)).toEqual([]);
  });

  it('has a unique id per landmark', () => {
    const ids = LANDMARKS.map((landmark) => landmark.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('rejects an owner with no contact address', () => {
    expect(validateOwner({ name: 'A', links: [] }).join()).toMatch(/email/);
  });

  it('rejects a landmark that is not on a block centre', () => {
    const problems = validateLandmark({ ...LANDMARKS[0], x: 300 });
    expect(problems.join()).toMatch(/not a block centre/);
  });

  it('rejects an unknown structure style', () => {
    const problems = validateLandmark({
      ...LANDMARKS[0],
      structure: { w: 10, d: 10, h: 10, style: 'pyramid' },
    });
    expect(problems.join()).toMatch(/unknown structure style/);
  });

  it('rejects a malformed colour', () => {
    const problems = validateLandmark({ ...LANDMARKS[0], accent: 'red' });
    expect(problems.join()).toMatch(/accent must be a #rrggbb colour/);
  });
});
