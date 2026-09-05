import { LANDMARKS } from '../content/resume.js';
import { createRng } from '../core/rng.js';
import {
  buildBlock,
  createThemeDealer,
  decorateLandmarkPaddock,
  eachBlock,
} from './course-blocks.js';
import { landmarkBoxes, paddockBlockKeys } from './landmarks.js';
import { buildPuddles } from './puddles.js';
import { buildBoostPads, buildLamps, buildParkedCars } from './street-furniture.js';
import { createSurfaceSampler } from './surfaces.js';

/** Fixed seed: the stage must be byte-identical on every visit and every CI run. */
export const CITY_SEED = 20260903;

/**
 * Assembles the whole rally stage as plain data.
 *
 * Nothing here imports Three.js, touches the DOM, or knows a renderer exists.
 * That is the point: the same structure feeds the WebGL scene, the minimap,
 * the collision solver and the unit tests, and swapping the renderer does not
 * touch a line of it.
 *
 * `scenery` carries a `kind` — 'rock', 'barn', 'bales', 'stand' or 'landmark' —
 * and otherwise keeps the box shape the collision solver has always read, so
 * src/physics did not have to learn what a boulder is.
 *
 * @returns {{
 *   scenery: object[], cars: object[], props: object[], boostPads: object[],
 *   puddles: object[], colliders: object[],
 *   surfaceAt: (x: number, z: number) => number
 * }}
 */
export function createCity(seed = CITY_SEED) {
  const rng = createRng(seed);
  const nextTheme = createThemeDealer(rng);
  const scenery = [];
  const props = [];

  const landmarkByBlock = new Map(
    LANDMARKS.map((landmark) => [`${landmark.x},${landmark.z}`, landmark]),
  );

  for (const block of eachBlock()) {
    const landmark = landmarkByBlock.get(`${block.x},${block.z}`);

    if (landmark) {
      scenery.push(...landmarkBoxes(landmark).map((box) => ({ ...box, kind: 'landmark' })));
      props.push(...decorateLandmarkPaddock(rng, landmark));
      continue;
    }

    const built = buildBlock(rng, block.x, block.z, nextTheme());
    scenery.push(...built.scenery);
    props.push(...built.props);
  }

  const cars = buildParkedCars(rng);
  const puddles = buildPuddles();
  props.push(...buildLamps());

  return {
    scenery,
    cars,
    props,
    boostPads: buildBoostPads(),
    /* Everything the kart can hit, in one list: only boxes that stand on the
       ground, since masts and awnings are overhead. Tree stands are props, not
       scenery, so a copse is something you drive through. */
    colliders: [...scenery, ...cars].filter((box) => box.base === 0),
    puddles,
    surfaceAt: createSurfaceSampler(paddockBlockKeys, puddles),
  };
}
