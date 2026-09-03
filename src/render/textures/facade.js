import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { GLASS } from '../../config/palette.js';
import { createRng } from '../../core/rng.js';

/** World units covered by one window cell. Drives the shader's UV scale. */
export const FACADE_CELL = 22;
/** Cells per texture edge. Larger means the pattern repeats less obviously. */
const CELLS = 4;
const CELL_PIXELS = 128;
const LIT_CHANCE = 0.3;

/**
 * A tileable block of windows.
 *
 * Painted once at load into a canvas rather than shipped as an image, so the
 * city still has windows with no assets fetched. The alpha channel carries the
 * window mask; the facade shader multiplies the colour in and leaves the wall
 * showing through everywhere else.
 */
export function createFacadeTexture(seed = 7) {
  const size = CELLS * CELL_PIXELS;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rng = createRng(seed);

  ctx.clearRect(0, 0, size, size);

  for (let cx = 0; cx < CELLS; cx += 1) {
    for (let cy = 0; cy < CELLS; cy += 1) {
      paintWindow(ctx, rng, cx * CELL_PIXELS, cy * CELL_PIXELS);
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function paintWindow(ctx, rng, originX, originY) {
  const lit = rng() < LIT_CHANCE;
  const inset = CELL_PIXELS * 0.19;
  const width = CELL_PIXELS - inset * 2;
  const height = CELL_PIXELS - inset * 2;
  const x = originX + inset;
  const y = originY + inset;

  // Recessed reveal, so the window reads as a hole in the wall rather than a
  // sticker on it. Drawn dark and slightly larger than the pane.
  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  ctx.fillRect(x - 3, y - 3, width + 6, height + 6);

  ctx.fillStyle = lit ? GLASS.LIT : GLASS.DARK;
  ctx.fillRect(x, y, width, height);

  if (!lit) {
    // A slanted glint of sky. Cutting it on the diagonal rather than straight
    // across is what separates glass from a rectangle in two shades of blue.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.62);
    ctx.lineTo(x + width, y + height * 0.26);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(190,222,246,0.55)';
    ctx.fill();
    ctx.restore();
  }

  // Mullion.
  ctx.fillStyle = 'rgba(20,24,32,0.45)';
  ctx.fillRect(x + width / 2 - 1.5, y, 3, height);
}
