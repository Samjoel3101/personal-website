import { DISCOVER_RADIUS } from '../config/world.js';
import { LANDMARKS } from '../content/resume.js';
import { wrapDistance } from '../core/torus.js';

/** Extra distance you must leave before a landmark can trigger again. */
const HYSTERESIS = 45;

/**
 * Decides when the kart has arrived somewhere worth reading.
 *
 * Two ways in: driving inside the ring, or bumping into the building itself.
 * The second is a deliberate safety net — the stadium's stands sit further from
 * its centre than the ring's radius, so without it that landmark would only be
 * reachable through a gap most people would never find.
 *
 * The `inZone` latch is what stops a card reopening every frame while you sit
 * parked on top of it, and the hysteresis band stops it flickering when you
 * idle exactly on the boundary.
 */
export function createDiscovery(emitter) {
  const found = new Set();
  const inZone = new Set();

  function check(kart) {
    for (const landmark of LANDMARKS) {
      const distance = wrapDistance(kart.x, kart.z, landmark.x, landmark.z);
      const arrived = distance < DISCOVER_RADIUS || kart.touchingLandmarkId === landmark.id;

      if (arrived && !inZone.has(landmark.id)) {
        inZone.add(landmark.id);
        const isNew = !found.has(landmark.id);
        found.add(landmark.id);
        emitter.emit(isNew ? 'landmark:discovered' : 'landmark:revisited', landmark);
        if (isNew && found.size === LANDMARKS.length) emitter.emit('tour:complete', { found });
        return;
      }

      if (!arrived && inZone.has(landmark.id) && distance > DISCOVER_RADIUS + HYSTERESIS) {
        inZone.delete(landmark.id);
      }
    }
  }

  return {
    check,
    get found() {
      return found;
    },
    get total() {
      return LANDMARKS.length;
    },
    /** Nearest landmark not yet read, for the compass. */
    nextTarget(kart) {
      let best = null;
      let bestDistance = Infinity;
      for (const landmark of LANDMARKS) {
        if (found.has(landmark.id)) continue;
        const distance = wrapDistance(kart.x, kart.z, landmark.x, landmark.z);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = landmark;
        }
      }
      return best ? { landmark: best, distance: bestDistance } : null;
    },
  };
}
