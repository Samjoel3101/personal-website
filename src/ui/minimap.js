import { WORLD } from '../config/world.js';
import { LANDMARKS } from '../content/resume.js';
import { trackOffsetAt } from '../world/track.js';

const SIZE = 150;

/**
 * North-up stage map.
 *
 * The static half — tracks and scenery footprints — is painted once into an
 * offscreen canvas and blitted each frame. Redrawing two hundred footprints
 * sixty times a second to move one triangle would be the single most expensive
 * thing the UI does.
 */
export function createMinimap(canvas, city, discovery) {
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  const scale = SIZE / WORLD.SIZE;
  const base = paintBase(city, scale);

  return {
    update(kart) {
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.drawImage(base, 0, 0);

      for (const landmark of LANDMARKS) {
        ctx.beginPath();
        ctx.arc(landmark.x * scale, landmark.z * scale, 4.5, 0, Math.PI * 2);
        if (discovery.found.has(landmark.id)) {
          ctx.fillStyle = landmark.accent;
          ctx.fill();
        } else {
          ctx.strokeStyle = landmark.accent;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      ctx.save();
      ctx.translate(kart.x * scale, kart.z * scale);
      ctx.rotate(kart.heading);
      ctx.fillStyle = '#ffd23c';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4.5, 5);
      ctx.lineTo(-4.5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
  };
}

function paintBase(city, scale) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1b2417';
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.fillStyle = '#3b4a2c';
  for (const box of city.buildings) {
    if (box.base > 0) continue;
    ctx.fillRect(
      (box.x - box.halfWidth) * scale,
      (box.z - box.halfDepth) * scale,
      box.halfWidth * 2 * scale,
      box.halfDepth * 2 * scale,
    );
  }

  paintTracks(ctx, scale);
  return canvas;
}

/** The tracks snake, so the map has to snake with them or it lies about where
 *  the dirt is — which is the one thing a map is for. */
function paintTracks(ctx, scale) {
  const STEP = 16;
  ctx.strokeStyle = '#7a5c34';
  ctx.lineWidth = Math.max(1, WORLD.ROAD_HALF * 2 * scale);
  ctx.lineCap = 'round';

  for (let i = 0; i < WORLD.GRID; i += 1) {
    const line = i * WORLD.BLOCK;
    for (const axis of ['z', 'x']) {
      ctx.beginPath();
      for (let along = 0; along <= WORLD.SIZE; along += STEP) {
        const across = (line + trackOffsetAt(along)) * scale;
        const down = along * scale;
        if (along === 0) ctx.moveTo(...(axis === 'z' ? [across, down] : [down, across]));
        else ctx.lineTo(...(axis === 'z' ? [across, down] : [down, across]));
      }
      ctx.stroke();
    }
  }
}
