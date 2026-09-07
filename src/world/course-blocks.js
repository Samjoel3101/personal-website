import { LOT_HALF, WORLD, blockCentre } from '../config/world.js';
import { PROPS, STRUCTURES, TERRAIN } from '../config/palette.js';
import { chanceFrom, pickFrom, rangeFrom } from '../core/rng.js';

/**
 * What fills one block of the stage.
 *
 * Each block draws a THEME from the seeded RNG, and the themes are what make
 * the world worth wandering: a grid of identical lots was a city, and a rally
 * stage that looked like one would be a worse rally stage. Drive three blocks
 * in any direction and the scenery should have changed character.
 *
 * Colliders and scatter are a deliberate split. Rocks, barns, bale stacks and
 * spectator stands are boxes and they stop you. Tree stands are props and do
 * not: cutting through a copse is fun, bouncing off an invisible box drawn
 * around one is not.
 */

const THEMES = ['forest', 'quarry', 'farm', 'meadow'];

/** Keep scenery this far inside the lot, so nothing overhangs the verge. */
const EDGE_INSET = 18;

/**
 * Deals themes from a shuffled deck rather than drawing each one independently.
 *
 * There are only ten ordinary blocks and four themes: picking uniformly at
 * random gave a stage that was two-thirds farm with one lonely wood in it.
 * Dealing guarantees every theme appears, which is the whole point of having
 * four of them.
 */
export function createThemeDealer(rng) {
  let deck = [];
  return function nextTheme() {
    if (deck.length === 0) {
      deck = [...THEMES];
      for (let i = deck.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
    }
    return deck.pop();
  };
}

export function buildBlock(rng, blockX, blockZ, theme) {
  const block = { rng, x: blockX, z: blockZ, scenery: [], props: [] };
  THEME_BUILDERS[theme](block);
  return { scenery: block.scenery, props: block.props, theme };
}

/** A point somewhere in the block's interior. */
function spot(block, spread = 1) {
  const reach = (LOT_HALF - EDGE_INSET) * spread;
  return {
    x: block.x + rangeFrom(block.rng, -reach, reach),
    z: block.z + rangeFrom(block.rng, -reach, reach),
  };
}

/**
 * A collidable box, pulled back inside the lot if its own bulk would push it
 * out. The lot already has the track's wobble subtracted from it (see
 * LOT_HALF), so anything that stays inside a lot is guaranteed to clear the
 * track however far the track has swung toward it.
 */
function box(block, kind, at, { halfWidth, halfDepth, height, color }) {
  const pull = (coord, centre, half) =>
    centre + clampTo(coord - centre, LOT_HALF - half - EDGE_INSET);

  return {
    kind,
    x: pull(at.x, block.x, halfWidth),
    z: pull(at.z, block.z, halfDepth),
    halfWidth,
    halfDepth,
    base: 0,
    height,
    color,
    windows: false,
  };
}

const clampTo = (value, limit) => Math.max(-limit, Math.min(limit, value));

/** How wide a forest stand is, and therefore how wide a forest patch model
 *  has to be scaled to cover one. */
const COPSE_RADIUS = 40;

function tree(block, at, min, max, copse = false) {
  block.props.push({
    type: 'tree',
    x: at.x,
    z: at.z,
    height: rangeFrom(block.rng, min, max),
    copse,
  });
}

function rock(block, at, size, height) {
  block.scenery.push(
    box(block, 'rock', at, {
      halfWidth: size,
      halfDepth: size * rangeFrom(block.rng, 0.7, 1.3),
      height,
      color: chanceFrom(block.rng, 0.4) ? TERRAIN.ROCK_DARK : TERRAIN.ROCK,
    }),
  );
}

const THEME_BUILDERS = {
  /** Dense conifer stands, a few boulders, and one pile of cut timber. */
  forest(block) {
    for (let stand = 0; stand < 3; stand += 1) {
      const centre = spot(block, 0.7);
      // The copse marker is what a downloaded forest patch replaces; the
      // individual trees under it are what stands in for one otherwise.
      block.props.push({ type: 'copse', x: centre.x, z: centre.z, radius: COPSE_RADIUS });
      const count = 4 + Math.floor(block.rng() * 4);
      for (let i = 0; i < count; i += 1) {
        tree(
          block,
          {
            x: centre.x + rangeFrom(block.rng, -COPSE_RADIUS * 0.85, COPSE_RADIUS * 0.85),
            z: centre.z + rangeFrom(block.rng, -COPSE_RADIUS * 0.85, COPSE_RADIUS * 0.85),
          },
          44,
          72,
          true,
        );
      }
    }
    for (let i = 0; i < 3; i += 1) {
      rock(block, spot(block), rangeFrom(block.rng, 8, 15), rangeFrom(block.rng, 12, 24));
    }
    block.scenery.push(baleStack(block, spot(block, 0.8), PROPS.TIMBER));
  },

  /** Big outcrops with rubble scattered around their feet. */
  quarry(block) {
    for (let i = 0; i < 4; i += 1) {
      rock(block, spot(block, 0.8), rangeFrom(block.rng, 22, 40), rangeFrom(block.rng, 34, 74));
    }
    for (let i = 0; i < 7; i += 1) {
      rock(block, spot(block), rangeFrom(block.rng, 4, 9), rangeFrom(block.rng, 5, 12));
    }
  },

  /** A barn, its bale stacks, and a spectator stand watching the stage. */
  farm(block) {
    const barnAt = spot(block, 0.5);
    block.scenery.push(
      box(block, 'barn', barnAt, {
        halfWidth: rangeFrom(block.rng, 26, 38),
        halfDepth: rangeFrom(block.rng, 18, 26),
        height: rangeFrom(block.rng, 34, 52),
        color: pickFrom(block.rng, STRUCTURES),
      }),
    );

    const stacks = 2 + Math.floor(block.rng() * 3);
    for (let i = 0; i < stacks; i += 1) {
      block.scenery.push(baleStack(block, spot(block), PROPS.HAY));
    }

    tree(block, spot(block), 46, 64);
    addStand(block, 0.6);
  },

  /** Mostly open. A lone tree, one rock, and somewhere to watch from. */
  meadow(block) {
    const lone = 1 + Math.floor(block.rng() * 2);
    for (let i = 0; i < lone; i += 1) tree(block, spot(block, 0.7), 50, 76);
    rock(block, spot(block), rangeFrom(block.rng, 6, 12), rangeFrom(block.rng, 8, 16));
    addStand(block, 0.45);
  },
};

/** A spectator stand, pushed out toward whichever edge the RNG picks. */
function addStand(block, chance) {
  if (!chanceFrom(block.rng, chance)) return;

  const edge = LOT_HALF - EDGE_INSET;
  const alongX = chanceFrom(block.rng, 0.5);
  const side = chanceFrom(block.rng, 0.5) ? 1 : -1;
  const drift = rangeFrom(block.rng, -50, 50);
  const at = alongX
    ? { x: block.x + drift, z: block.z + side * edge }
    : { x: block.x + side * edge, z: block.z + drift };
  const long = rangeFrom(block.rng, 34, 52);

  block.scenery.push(
    box(block, 'stand', at, {
      halfWidth: alongX ? long : 11,
      halfDepth: alongX ? 11 : long,
      height: rangeFrom(block.rng, 16, 24),
      color: pickFrom(block.rng, STRUCTURES),
    }),
  );
}

/** Trees ringing a landmark paddock, plus the signpost at its edge. */
export function decorateLandmarkPaddock(rng, landmark) {
  const props = [];
  const RING_COUNT = 10;

  for (let i = 0; i < RING_COUNT; i += 1) {
    const angle = (i / RING_COUNT) * Math.PI * 2;
    props.push({
      type: 'tree',
      x: landmark.x + Math.cos(angle) * (LOT_HALF - 6),
      z: landmark.z + Math.sin(angle) * (LOT_HALF - 6),
      height: rangeFrom(rng, 46, 60),
    });
  }

  props.push({
    type: 'sign',
    x: landmark.x,
    z: landmark.z - LOT_HALF + 24,
    height: 54,
    landmarkId: landmark.id,
  });

  return props;
}

/** Every block centre in the grid, as {bi, bj, x, z}. */
export function eachBlock() {
  const blocks = [];
  for (let bi = 0; bi < WORLD.GRID; bi += 1) {
    for (let bj = 0; bj < WORLD.GRID; bj += 1) {
      blocks.push({ bi, bj, x: blockCentre(bi), z: blockCentre(bj) });
    }
  }
  return blocks;
}

/**
 * A stack of round bales.
 *
 * Authored close to square on purpose. The renderer draws these as actual
 * cylinders filling the collision box, so a box half as deep as it is wide
 * would squash every bale into an ellipse — which is exactly what these used
 * to look like. Height comes out a little under the width because a two-high
 * stack is wider than it is tall.
 */
function baleStack(block, at, color) {
  const half = rangeFrom(block.rng, 11, 16);
  return box(block, 'bales', at, {
    halfWidth: half,
    halfDepth: half,
    height: half * rangeFrom(block.rng, 1.05, 1.25),
    color,
  });
}
