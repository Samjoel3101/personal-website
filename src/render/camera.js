import { PerspectiveCamera, Vector3 } from 'three';
import { CAMERA } from '../config/render.js';
import { KART } from '../config/tuning.js';
import { clamp, damp } from '../core/math.js';
import { createGroundFollow } from './ground-follow.js';

/**
 * Chase camera.
 *
 * The kart is pinned to the scene origin — the city moves around it, which is
 * how a wrapping world avoids ever teleporting the player (see
 * src/render/scene.js). So the camera orbits a fixed point rather than
 * following a moving one, and the lag that makes cornering feel like
 * cornering shows up as the camera swinging around the kart.
 *
 * The one thing it has to track is the terrain: the kart is lifted onto the
 * heightfield in src/render/scene.js, so a camera pinned to y = 0 would sink
 * into a hill the moment you left the track. It follows the same ground more
 * softly than the kart does, which reads as suspension rather than as a
 * camera fighting the scenery.
 */
/** Softer than the kart's, so the view does not bob over every facet. */
const CAMERA_GROUND_LAMBDA = 5;

/**
 * Widens the frame as the kart gets fast.
 *
 * A chase camera at a fixed distance gives no sense of speed at all: the kart
 * fills the same pixels at 40 as at 380. Pushing the field of view out drags
 * the scenery past the edges of the frame faster than the middle, which is the
 * whole effect. Kept small and slow — a big or snappy kick reads as a glitch.
 *
 * updateProjectionMatrix is skipped when nothing moved, so a kart sitting still
 * costs nothing.
 */
function applyFovKick(camera, kart, dt) {
  const fraction = clamp(Math.abs(kart.speed) / KART.MAX_SPEED, 0, 1.6);
  const wanted = CAMERA.FOV + fraction * CAMERA.FOV_KICK;
  const next = damp(camera.fov, wanted, CAMERA.FOV_LAMBDA, dt);
  if (Math.abs(next - camera.fov) < 0.002) return;
  camera.fov = next;
  camera.updateProjectionMatrix();
}
export function createChaseCamera() {
  const camera = new PerspectiveCamera(CAMERA.FOV, 1, CAMERA.NEAR, CAMERA.FAR);
  const target = new Vector3();
  const desired = new Vector3();
  const lookAt = new Vector3(0, CAMERA.LOOK_HEIGHT, 0);
  const ground = createGroundFollow(CAMERA_GROUND_LAMBDA);

  // Start behind the kart so the first frame is not a swing into place.
  camera.position.set(0, CAMERA.HEIGHT, -CAMERA.DISTANCE);

  return {
    camera,

    setAspect(aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    },

    /**
     * @param {{x: number, z: number, heading: number, slide: number, speed: number}} kart
     * @param {number} dt seconds
     */
    update(kart, dt) {
      // Behind means opposite the heading; +Z is forward at heading 0.
      const sin = Math.sin(kart.heading);
      const cos = Math.cos(kart.heading);

      const groundHeight = ground.update(kart.x, kart.z, dt);
      lookAt.y = CAMERA.LOOK_HEIGHT + groundHeight;

      // Drifting swings the camera wide, which is what sells a slide.
      const lateral = kart.slide * 0.5;
      desired.set(
        -sin * CAMERA.DISTANCE - cos * lateral,
        CAMERA.HEIGHT + groundHeight,
        -cos * CAMERA.DISTANCE + sin * lateral,
      );

      target.copy(desired);
      camera.position.x = damp(camera.position.x, target.x, CAMERA.FOLLOW_LAMBDA, dt);
      camera.position.y = damp(camera.position.y, target.y, CAMERA.FOLLOW_LAMBDA, dt);
      camera.position.z = damp(camera.position.z, target.z, CAMERA.FOLLOW_LAMBDA, dt);
      camera.lookAt(lookAt);
      applyFovKick(camera, kart, dt);
    },
  };
}
