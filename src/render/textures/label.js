import { CanvasTexture, SRGBColorSpace } from 'three';

const FONT_STACK = '"Fredoka", "Trebuchet MS", sans-serif';
const PADDING = 40;
const FONT_SIZE = 78;

/**
 * Renders text into a texture for the floating landmark name plates.
 *
 * These are what turn the city from a maze into a map: you can read your next
 * destination from two blocks out, which is the difference between exploring
 * and wandering.
 */
export function createLabelTexture(text, accent) {
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = `600 ${FONT_SIZE}px ${FONT_STACK}`;
  const width = Math.ceil(measure.measureText(text).width) + PADDING * 2;
  const height = FONT_SIZE + PADDING * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const radius = height / 2;
  ctx.fillStyle = 'rgba(14,20,36,0.88)';
  roundedRect(ctx, { x: 0, y: 0, width, height }, radius);
  ctx.fill();

  ctx.strokeStyle = accent;
  ctx.lineWidth = 7;
  roundedRect(ctx, { x: 3.5, y: 3.5, width: width - 7, height: height - 7 }, radius - 3.5);
  ctx.stroke();

  ctx.font = `600 ${FONT_SIZE}px ${FONT_STACK}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2 + 2);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return { texture, aspect: width / height };
}

/** An emoji or short glyph on a coloured plate, for the landmark signposts. */
export function createIconTexture(icon, color, accent) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  roundedRect(ctx, { x: 0, y: 0, width: size, height: size }, 34);
  ctx.fill();
  ctx.fillStyle = color;
  roundedRect(ctx, { x: 12, y: 12, width: size - 24, height: size - 24 }, 26);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  roundedRect(ctx, { x: 16, y: 16, width: size - 32, height: size - 32 }, 22);
  ctx.stroke();

  ctx.font = `${size * 0.52}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, size / 2, size * 0.56);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function roundedRect(ctx, rect, radius) {
  const { x, y, width, height } = rect;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
