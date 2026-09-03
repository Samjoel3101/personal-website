import { PerspectiveCamera, Vector3 } from 'three';
import { CAMERA } from '../config/render.js';
import { damp } from '../core/math.js';

/**
 * Chase camera.
 *
 * The kart is pinned to the scene origin — the city moves around it, which is
 * how a wrapping world avoids ever teleporting the player (see
 * src/render/scene.js). So the camera orbits a fixed point rather than
 * following a moving one, and the lag that makes cornering feel like
 * cornering shows up as the camera swinging around the kart.
 */
export function createChaseCamera() {
  const camera = new PerspectiveCamera(CAMERA.FOV, 1, CAMERA.NEAR, CAMERA.FAR);
  const target = new Vector3();
  const desired = new Vector3();
  const lookAt = new Vector3(0, CAMERA.LOOK_HEIGHT, 0);

  // Start behind the kart so the first frame is not a swing into place.
  camera.position.set(0, CAMERA.HEIGHT, -CAMERA.DISTANCE);

  return {
    camera,

    setAspect(aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    },

    /**
     * @param {{heading: number, slide: number, speed: number}} kart
     * @param {number} dt seconds
     */
    update(kart, dt) {
      // Behind means opposite the heading; +Z is forward at heading 0.
      const sin = Math.sin(kart.heading);
      const cos = Math.cos(kart.heading);

      // Drifting swings the camera wide, which is what sells a slide.
      const lateral = kart.slide * 0.5;
      desired.set(
        -sin * CAMERA.DISTANCE - cos * lateral,
        CAMERA.HEIGHT,
        -cos * CAMERA.DISTANCE + sin * lateral,
      );

      target.copy(desired);
      camera.position.x = damp(camera.position.x, target.x, CAMERA.FOLLOW_LAMBDA, dt);
      camera.position.y = damp(camera.position.y, target.y, CAMERA.FOLLOW_LAMBDA, dt);
      camera.position.z = damp(camera.position.z, target.z, CAMERA.FOLLOW_LAMBDA, dt);
      camera.lookAt(lookAt);
    },
  };
}
