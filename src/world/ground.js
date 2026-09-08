import { GROUND, MEADOW, ROCK, TRAIL, WATER } from '../config/palette.js';
import { BIOME_IDS, biomeWeights, journeyAt } from './biome.js';
import { blendHex, mixHex } from '../core/colour.js';
import { noise2 } from '../core/noise.js';
import { smoothstep } from '../core/math.js';
import { bankFactor } from './water.js';
import { pathFactor, scuffFactor } from './path.js';
import { patchAt } from './patches.js';

/**
 * What colour the ground is at a point.
 *
 * Five things decide it, in order. The biome blend gives the base — forest
 * green through to desert sand, mixed by exactly the same weights that decide
 * how tall the hills are. Steepness then peels that back: soil does not cling
 * to a cliff, so anything past a gentle slope shades toward its own bare tone
 * and anything past a steep one toward bare rock. Finally the shoreline of a
 * pool bleaches out to wet sand, and the trail is bare earth with a scuffed
 * edge where it meets the undergrowth.
 *
 * It lives in the world model rather than the renderer for one reason: it is
 * arithmetic on numbers and hex strings, and putting it here means the
 * palette is unit-testable and the heightfield builder stays a loop that asks
 * for a colour and writes it into a buffer.
 */

/** Rock is cool and grey under the forest, warm and iron-red in the desert. */
const rockFor = (weights) =>
  mixHex(ROCK.COOL, ROCK.WARM, (weights.scrub ?? 0) * 0.5 + (weights.desert ?? 0));

export function groundColour(x, z, slope) {
  const weights = biomeWeights(journeyAt(x, z));

  const flat = blendHex(BIOME_IDS.map((id) => [GROUND[id].flat, weights[id]]));
  const bare = blendHex(BIOME_IDS.map((id) => [GROUND[id].bare, weights[id]]));
  const steep = blendHex(BIOME_IDS.map((id) => [GROUND[id].slope, weights[id]]));

  // Two stages rather than one ramp: the first is grass thinning on a bank,
  // the second is the soil giving out altogether.
  let colour = mixHex(flat, steep, smoothstep(0.12, 0.42, slope));
  colour = mixHex(colour, bare, smoothstep(0.4, 0.72, slope));
  colour = mixHex(colour, rockFor(weights), smoothstep(0.7, 1.15, slope));

  // Broad mottling, so a hillside is never one flat wash of a single green.
  const mottle = noise2(x * 0.006, z * 0.006, 3);
  colour = mixHex(colour, mottle > 0 ? steep : flat, Math.abs(mottle) * 0.3);

  // The plant communities, painted into the ground they grow on. A drift of
  // dry grass sits on ground that has gone gold and a fern bank sits on ground
  // that has gone dark, and those stands are most of what gives a wide shot
  // its depth — the planting alone reads as texture.
  const patch = patchAt(x, z);
  const green = 1 - (weights.desert ?? 0);
  colour = mixHex(colour, MEADOW.DRY, patch.dry * 0.6 * green);
  colour = mixHex(colour, MEADOW.RICH, (patch.shade + patch.clover) * 0.3 * green);

  colour = mixHex(colour, WATER.BANK, bankFactor(x, z) * 0.85);

  // The trail last, over the top of everything: it is worn earth, and what it
  // is worn through does not change what it looks like. The scuff term keeps
  // its edge from being a drawn line by bleeding a little earth into the green
  // either side — a little, because this is a footpath.
  const earth = blendHex(BIOME_IDS.map((id) => [TRAIL[id], weights[id]]));
  const trail = Math.min(1, pathFactor(x, z) + scuffFactor(x, z) * 0.35);
  return mixHex(colour, earth, trail);
}
