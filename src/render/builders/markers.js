import {
  DoubleSide,
  Group,
  Mesh,
  PlaneGeometry,
  RingGeometry,
  Sprite,
  SpriteMaterial,
} from 'three';
import { MeshBasicMaterial } from 'three';
import { LANDMARKS } from '../../content/resume.js';
import { DISCOVER_RADIUS } from '../../config/world.js';
import { TILE_OFFSETS } from '../geometry/tiling.js';
import { createIconTexture, createLabelTexture } from '../textures/label.js';

const LABEL_WORLD_HEIGHT = 26;
const SIGN_SIZE = 26;
const SIGN_HEIGHT = 40;

/**
 * Landmark signage: the glowing ring you drive into, the icon signpost at the
 * kerb, and the name plate floating over the roof.
 *
 * Each landmark's marker group is cloned across the 3x3 world tiling. They are
 * ordinary objects rather than instances because there are only six of them
 * and each needs its own texture, so frustum culling does more good here than
 * instancing would.
 */
export function buildMarkers() {
  const group = new Group();
  group.name = 'markers';

  for (const landmark of LANDMARKS) {
    const marker = buildOne(landmark);
    for (const offsetX of TILE_OFFSETS) {
      for (const offsetZ of TILE_OFFSETS) {
        const copy = marker.clone();
        copy.position.set(landmark.x + offsetX, 0, landmark.z + offsetZ);
        group.add(copy);
      }
    }
  }

  return group;
}

function buildOne(landmark) {
  const marker = new Group();
  marker.add(discoveryRing(landmark));
  marker.add(signpost(landmark));
  marker.add(namePlate(landmark));
  return marker;
}

/** The target you drive into. Emissive so the bloom pass makes it glow. */
function discoveryRing(landmark) {
  const ring = new Mesh(
    new RingGeometry(DISCOVER_RADIUS - 7, DISCOVER_RADIUS, 64),
    new MeshBasicMaterial({
      color: landmark.accent,
      side: DoubleSide,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      fog: true,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.16;
  return ring;
}

function signpost(landmark) {
  const group = new Group();
  const board = new Mesh(
    new PlaneGeometry(SIGN_SIZE, SIGN_SIZE),
    new MeshBasicMaterial({
      map: createIconTexture(landmark.icon, landmark.color, landmark.accent),
      transparent: true,
      side: DoubleSide,
    }),
  );
  board.position.set(0, SIGN_HEIGHT, 0);
  group.add(board);
  group.position.set(0, 0, -DISCOVER_RADIUS + 8);
  return group;
}

function namePlate(landmark) {
  const { texture, aspect } = createLabelTexture(landmark.title, landmark.accent);
  const sprite = new Sprite(
    new SpriteMaterial({ map: texture, transparent: true, depthTest: true }),
  );
  sprite.scale.set(LABEL_WORLD_HEIGHT * aspect, LABEL_WORLD_HEIGHT, 1);
  sprite.position.y = landmark.structure.h + 26;
  return sprite;
}
