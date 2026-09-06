import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { createRng } from '../../core/rng.js';

const WIDTH = 2048;
const HEIGHT = 1024;
const DECKS = 3;

/**
 * A cloud deck painted onto a canvas at load time.
 *
 * Procedural rather than an HDRI because the sky has to keep working when no
 * assets have been fetched, and because a seeded canvas is identical in every
 * screenshot test. The horizontal axis wraps, so the texture can be mapped
 * around a sphere without a seam.
 */
export function createCloudTexture(seed = 4242) {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const rng = createRng(seed);

  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  for (let deck = 0; deck < DECKS; deck += 1) {
    const scale = 1.15 - deck * 0.24;
    const alpha = 0.97 - deck * 0.18;
    // Lower and deeper than a midday city sky: the deck sits over the hills
    // rather than in a clear ring above them, and the shader fades it out
    // right at the horizon so it never smears into a band.
    const bandTop = HEIGHT * (0.1 + deck * 0.16);
    const bandHeight = HEIGHT * 0.34;

    for (let i = 0; i < 32 - deck * 5; i += 1) {
      const cx = rng() * WIDTH;
      const cy = bandTop + rng() * bandHeight;
      const style = { scale, alpha };
      paintCloud(ctx, rng, { x: cx, y: cy }, style);
      // Repeat anything near an edge on the far side so the wrap is seamless.
      if (cx < 240) paintCloud(ctx, createRng(i * 31 + deck), { x: cx + WIDTH, y: cy }, style);
      if (cx > WIDTH - 240) {
        paintCloud(ctx, createRng(i * 71 + deck), { x: cx - WIDTH, y: cy }, style);
      }
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function paintCloud(ctx, rng, centre, { scale, alpha }) {
  const { x: cx, y: cy } = centre;
  const puffs = 5 + Math.floor(rng() * 4);
  // Shaded underside first, bright body over it: the two-pass order is what
  // stops a cloud reading as a flat white smudge.
  for (const [dy, tint] of [
    [11, `rgba(163,183,197,${alpha * 0.95})`],
    [0, `rgba(250,247,240,${alpha})`],
  ]) {
    for (let p = 0; p < puffs; p += 1) {
      const radius = (26 + rng() * 46) * scale;
      const px = cx + (p - puffs / 2) * 34 * scale;
      const py = cy + dy * scale + Math.sin(p * 1.7) * 10 * scale;
      const gradient = ctx.createRadialGradient(
        px,
        py - radius * 0.2,
        radius * 0.1,
        px,
        py,
        radius,
      );
      gradient.addColorStop(0, tint);
      gradient.addColorStop(0.6, tint.replace(/[\d.]+\)$/, `${alpha * 0.7})`));
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
