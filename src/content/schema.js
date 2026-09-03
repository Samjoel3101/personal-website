import { BLOCK_CENTRES } from '../config/world.js';

const STRUCTURE_STYLES = new Set(['tower', 'campus', 'workshop', 'stadium', 'cafe', 'post']);
const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

/**
 * Validates the resume content.
 *
 * This runs as a unit test rather than at runtime, because the failure mode it
 * guards against — a landmark nudged off a block centre and buried inside a
 * building — is invisible until someone drives into that corner of the city.
 * Catching it in CI is much cheaper than catching it by playing.
 */

/** @returns {string[]} problems with the owner block */
export function validateOwner(owner) {
  const problems = [];
  if (!owner?.name) problems.push('owner.name is required');
  if (!owner?.email?.includes('@')) problems.push('owner.email must be an email address');
  if (!Array.isArray(owner?.links)) problems.push('owner.links must be an array');
  return problems;
}

/** @returns {string[]} problems with one landmark */
export function validateLandmark(landmark) {
  const problems = [];
  const at = `landmark "${landmark.id ?? '(no id)'}"`;

  if (!landmark.id) problems.push(`${at}: id is required`);
  if (!landmark.title) problems.push(`${at}: title is required`);
  if (!landmark.icon) problems.push(`${at}: icon is required`);

  for (const key of ['color', 'accent']) {
    if (!HEX_COLOUR.test(landmark[key] ?? '')) {
      problems.push(`${at}: ${key} must be a #rrggbb colour`);
    }
  }

  for (const axis of ['x', 'z']) {
    if (!BLOCK_CENTRES.includes(landmark[axis])) {
      problems.push(
        `${at}: ${axis}=${landmark[axis]} is not a block centre ` +
          `(expected one of ${BLOCK_CENTRES.join(', ')})`,
      );
    }
  }

  if (!landmark.structure) {
    problems.push(`${at}: structure is required`);
  } else if (!STRUCTURE_STYLES.has(landmark.structure.style)) {
    problems.push(
      `${at}: unknown structure style "${landmark.structure.style}" ` +
        `(expected one of ${[...STRUCTURE_STYLES].join(', ')})`,
    );
  }

  if (!Array.isArray(landmark.sections) || landmark.sections.length === 0) {
    problems.push(`${at}: needs at least one section`);
  }

  return problems;
}

/** @returns {string[]} every problem in the content; empty means valid */
export function validateContent(owner, landmarks) {
  const problems = validateOwner(owner);

  if (!Array.isArray(landmarks) || landmarks.length === 0) {
    problems.push('at least one landmark is required');
    return problems;
  }

  const seenIds = new Set();
  for (const landmark of landmarks) {
    if (seenIds.has(landmark.id)) problems.push(`landmark "${landmark.id}": duplicate id`);
    seenIds.add(landmark.id);
    problems.push(...validateLandmark(landmark));
  }

  return problems;
}
