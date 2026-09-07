import { CanvasTexture, SRGBColorSpace } from 'three';

/**
 * Rebalances a photographic texture so it adds detail instead of darkness.
 *
 * A colour map MULTIPLIES whatever is under it. The terrain already carries
 * its landscape in vertex colours — meadow green, dry tops, stone on the steep
 * faces — and a grass photograph averaging about a quarter brightness turns all
 * of that into mud: mid green times mid green is nearly black, which is exactly
 * what a real grass texture did to this stage the first time.
 *
 * So the photo is recentred on white. Each channel becomes
 *
 *     1 + strength * (value / mean - 1)
 *
 * which leaves the average pixel at 1.0 — a no-op against the vertex colour —
 * and lets only the variation through. The blades and clumps still read; the
 * hillside stays the colour the palette says it is.
 *
 * @param {import('three').Texture} texture a loaded image texture
 * @param {number} strength 0 is flat white, 1 is the photo's own contrast
 * @returns {import('three').Texture} the rebalanced texture, or the original
 *   if it cannot be read
 */
export function toDetailTexture(texture, strength = 0.75) {
  const image = texture?.image;
  if (!image?.width) return texture;

  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);

  let pixels;
  try {
    pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    return texture; // tainted canvas; the photo as-is beats no ground at all
  }

  rebalance(pixels.data, strength);
  context.putImageData(pixels, 0, 0);

  const detail = new CanvasTexture(canvas);
  detail.wrapS = texture.wrapS;
  detail.wrapT = texture.wrapT;
  detail.anisotropy = texture.anisotropy;
  detail.colorSpace = SRGBColorSpace;
  return detail;
}

/** Recentres every channel on its own mean, in place. */
function rebalance(data, strength) {
  const totals = [0, 0, 0];
  for (let i = 0; i < data.length; i += 4) {
    totals[0] += data[i];
    totals[1] += data[i + 1];
    totals[2] += data[i + 2];
  }

  const pixels = data.length / 4;
  const means = totals.map((total) => Math.max(1, total / pixels));

  for (let i = 0; i < data.length; i += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      const ratio = data[i + channel] / means[channel];
      const balanced = 1 + strength * (ratio - 1);
      data[i + channel] = Math.max(0, Math.min(255, Math.round(balanced * 255)));
    }
  }
}
