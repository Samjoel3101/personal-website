import { BoxGeometry, CylinderGeometry, Group } from 'three';
import { mergeParts } from '../geometry/merge.js';
import { lambert } from '../materials.js';
import { tiledInstances } from '../geometry/tiling.js';

const POLE_HEIGHT = 66;
const ARM_LENGTH = 13;

/**
 * Street lamps, in two instanced meshes: the metal, and the lit head.
 *
 * They are split because the head carries an emissive term. That is what makes
 * the bloom pass pick it out at dusk-ish exposure, and an emissive value
 * cannot be varied per-vertex the way a diffuse colour can.
 */
export function buildLamps(city) {
  const group = new Group();
  group.name = 'lamps';

  const lamps = city.props.filter((prop) => prop.type === 'lamp');
  if (lamps.length === 0) return group;

  const items = lamps.map((lamp) => ({ x: lamp.x, z: lamp.z }));

  const metal = tiledInstances(poleGeometry(), lambert('#5a6069'), items);
  metal.receiveShadow = false;
  group.add(metal);

  const head = tiledInstances(
    headGeometry(),
    lambert('#fff3c4', { emissive: '#ffca55', emissiveIntensity: 1.6 }),
    items,
  );
  head.castShadow = false;
  head.receiveShadow = false;
  group.add(head);

  return group;
}

function poleGeometry() {
  const base = new CylinderGeometry(2.4, 3, 3, 8);
  base.translate(0, 1.5, 0);

  const pole = new CylinderGeometry(0.75, 1.05, POLE_HEIGHT, 8);
  pole.translate(0, POLE_HEIGHT / 2, 0);

  const arm = new BoxGeometry(ARM_LENGTH, 1.4, 1.4);
  arm.translate(ARM_LENGTH / 2, POLE_HEIGHT - 2, 0);

  return mergeParts([base, pole, arm], 'lamp-pole');
}

function headGeometry() {
  const head = new BoxGeometry(7, 2.4, 4);
  head.translate(ARM_LENGTH - 1, POLE_HEIGHT - 4, 0);
  return head;
}
