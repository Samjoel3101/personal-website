import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { createRng } from '../../core/rng.js';

/**
 * Leaf and bark detail, drawn rather than downloaded.
 *
 * No CC0 foliage or bark texture is reachable from the environment this is
 * built in — the whole PBR selection on the one host that answers is a grass
 * set and a rock set — so these are generated, like the clouds and the
 * facades. That is no loss: a photograph of leaves wrapped round a low-poly
 * canopy reads as a photograph of leaves, whereas clustered strokes at the
 * right scale read as foliage.
 *
 * Both are recentred on mid grey and used as a colour map over a tinted
 * material, so they modulate the palette instead of replacing it — the same
 * bargain ./detail.js strikes with the ground. Seeded, so two runs draw the
 * same tree.
 */

const SIZE = 256;

/** Clumped strokes, dark under light, at the scale of a bunch of leaves. */
export function createFoliageTexture() {
  const { canvas, context } = surface('#8f8f8f');
  const rng = createRng(8801);

  for (let i = 0; i < 1400; i += 1) {
    const x = rng() * SIZE;
    const y = rng() * SIZE;
    const length = 4 + rng() * 9;
    const angle = rng() * Math.PI * 2;
    // Half the strokes darken and half lift, so the average stays neutral and
    // the canopy keeps whatever green the model or the palette gave it.
    const shade = rng() < 0.5 ? 46 : 210;

    context.strokeStyle = `rgba(${shade}, ${shade}, ${shade}, ${0.16 + rng() * 0.22})`;
    context.lineWidth = 1 + rng() * 2.2;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    context.stroke();
  }

  return wrap(canvas);
}

/** Vertical striations, the way bark runs. */
export function createBarkTexture() {
  const { canvas, context } = surface('#8f8f8f');
  const rng = createRng(8802);

  for (let i = 0; i < 220; i += 1) {
    const x = rng() * SIZE;
    const width = 1 + rng() * 4;
    const shade = rng() < 0.55 ? 52 : 198;

    context.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${0.1 + rng() * 0.26})`;
    // Broken into segments rather than one stripe: unbroken verticals on a
    // trunk read as a barber's pole once the tree is instanced a hundred times.
    let y = 0;
    while (y < SIZE) {
      const run = 12 + rng() * 60;
      context.fillRect(x, y, width, run);
      y += run + rng() * 26;
    }
  }

  return wrap(canvas);
}

function surface(fill) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext('2d');
  context.fillStyle = fill;
  context.fillRect(0, 0, SIZE, SIZE);
  return { canvas, context };
}

function wrap(canvas) {
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
