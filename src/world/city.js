import { LANDMARKS } from '../content/resume.js';
import { createRng } from '../core/rng.js';
import { buildBlock, decorateLandmarkPlaza, eachBlock } from './city-blocks.js';
import { landmarkBoxes, plazaBlockKeys } from './landmarks.js';
import { buildBoostPads, buildLamps, buildParkedCars } from './street-furniture.js';
import { createSurfaceSampler } from './surfaces.js';

/** Fixed seed: the city must be byte-identical on every visit and every CI run. */
export const CITY_SEED = 20260903;

/**
 * Assembles the whole city as plain data.
 *
 * Nothing here imports Three.js, touches the DOM, or knows a renderer exists.
 * That is the point: the same structure feeds the WebGL scene, the minimap,
 * the collision solver and the unit tests, and swapping the renderer does not
 * touch a line of it.
 *
 * @returns {{
 *   buildings: object[], cars: object[], props: object[], boostPads: object[],
 *   colliders: object[], surfaceAt: (x: number, z: number) => number
 * }}
 */
export function createCity(seed = CITY_SEED) {
  const rng = createRng(seed);
  const buildings = [];
  const props = [];

  const landmarkByBlock = new Map(
    LANDMARKS.map((landmark) => [`${landmark.x},${landmark.z}`, landmark]),
  );

  for (const block of eachBlock()) {
    const landmark = landmarkByBlock.get(`${block.x},${block.z}`);

    if (landmark) {
      buildings.push(...landmarkBoxes(landmark).map((box) => ({ ...box, kind: 'landmark' })));
      props.push(...decorateLandmarkPlaza(rng, landmark));
      continue;
    }

    const built = buildBlock(rng, block.x, block.z);
    buildings.push(...built.buildings);
    props.push(...built.props);
  }

  const cars = buildParkedCars(rng);
  props.push(...buildLamps());

  return {
    buildings,
    cars,
    props,
    boostPads: buildBoostPads(),
    /* Everything the kart can hit, in one list: only boxes that stand on the
       ground, since spires and awnings are overhead. */
    colliders: [...buildings, ...cars].filter((box) => box.base === 0),
    surfaceAt: createSurfaceSampler(plazaBlockKeys),
  };
}
