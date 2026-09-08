/**
 * Colour arithmetic on hex strings, with no renderer involved.
 *
 * The ground's colour is a blend of four biome palettes, a slope term and a
 * shoreline term, and all of that is decided in the world model — which runs
 * in Node and has never heard of three.js. Keeping the mixing here means the
 * palette can be unit-tested and the renderer only ever receives finished
 * colours.
 *
 * Mixing happens in sRGB, which is not physically correct. It is however what
 * a flat, illustrated palette is authored against: the midpoint of two greens
 * looks like the green between them, which is the whole point.
 */
import { clamp, lerp } from './math.js';

/** '#rrggbb' → { r, g, b } in 0..255. */
export function parseHex(hex) {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

export function toHex({ r, g, b }) {
  const channel = (v) =>
    Math.round(clamp(v, 0, 255))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/** `t` of the way from `a` to `b`. */
export function mixHex(a, b, t) {
  const from = parseHex(a);
  const to = parseHex(b);
  return toHex({
    r: lerp(from.r, to.r, t),
    g: lerp(from.g, to.g, t),
    b: lerp(from.b, to.b, t),
  });
}

/** Weighted average of several colours. Weights need not sum to one. */
export function blendHex(entries) {
  let total = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  for (const [hex, weight] of entries) {
    if (!weight) continue;
    const colour = parseHex(hex);
    r += colour.r * weight;
    g += colour.g * weight;
    b += colour.b * weight;
    total += weight;
  }
  if (total === 0) return '#000000';
  return toHex({ r: r / total, g: g / total, b: b / total });
}

/** Multiplies every channel, for a per-instance tint jitter. */
export const shadeHex = (hex, factor) => {
  const { r, g, b } = parseHex(hex);
  return toHex({ r: r * factor, g: g * factor, b: b * factor });
};
