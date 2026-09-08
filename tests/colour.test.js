import { describe, expect, it } from 'vitest';
import { blendHex, mixHex, parseHex, shadeHex, toHex } from '../src/core/colour.js';

describe('colour arithmetic', () => {
  it('round-trips hex', () => {
    expect(toHex(parseHex('#3f6f33'))).toBe('#3f6f33');
  });

  it('mixes toward the far end', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('weights a blend', () => {
    expect(
      blendHex([
        ['#ff0000', 1],
        ['#0000ff', 1],
      ]),
    ).toBe('#800080');
    expect(
      blendHex([
        ['#ff0000', 3],
        ['#0000ff', 1],
      ]),
    ).toBe('#bf0040');
    // Weights need not sum to one, and a zero weight contributes nothing.
    expect(
      blendHex([
        ['#ff0000', 2],
        ['#0000ff', 0],
      ]),
    ).toBe('#ff0000');
  });

  it('has somewhere to go when every weight is zero', () => {
    expect(blendHex([['#ff0000', 0]])).toBe('#000000');
  });

  it('shades without leaving the range', () => {
    expect(shadeHex('#804020', 0.5)).toBe('#402010');
    expect(shadeHex('#804020', 4)).toBe('#ffff80');
  });
});
