import { KART } from '../config/tuning.js';
import { wrapDelta } from '../core/torus.js';

/**
 * The always-on overlay: how many stops you have found, which way the next one
 * is, how fast you are going, and how much boost is left.
 *
 * The compass is the single most important element here. Without it the city
 * is a maze; with it the city is a map you happen to be driving through.
 */
export function createHud(elements, discovery) {
  elements.progress.textContent = `Found 0/${discovery.total}`;

  return {
    update(kart, speedKph) {
      elements.progress.textContent = `Found ${discovery.found.size}/${discovery.total}`;
      elements.speed.textContent = String(speedKph);
      elements.boostBar.style.width = `${Math.round((kart.boost / KART.BOOST_DURATION) * 100)}%`;
      updateCompass(elements, discovery, kart);
    },
  };
}

function updateCompass(elements, discovery, kart) {
  const target = discovery.nextTarget(kart);

  if (!target) {
    elements.compassName.textContent = 'All found';
    elements.compassDistance.textContent = 'free roam';
    elements.compassArrow.style.transform = 'rotate(0deg)';
    return;
  }

  // Bearing relative to where the kart is pointing, so "up" means straight on.
  const dx = wrapDelta(target.landmark.x - kart.x);
  const dz = wrapDelta(target.landmark.z - kart.z);
  const bearing = Math.atan2(dx, dz) - kart.heading;

  elements.compassArrow.style.transform = `rotate(${(bearing * 180) / Math.PI}deg)`;
  elements.compassName.textContent = target.landmark.title;
  elements.compassDistance.textContent = `${Math.round(target.distance)} m away`;
}
