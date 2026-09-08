import { PerspectiveCamera, Vector3 } from 'three';
import { CAMERA, JOURNEY } from '../config/render.js';
import { WORLD } from '../config/world.js';
import { clamp, damp } from '../core/math.js';

/**
 * The flight down the valley.
 *
 * The camera is the only thing in this scene that moves, and it is what turns
 * a landscape into a journey: it drifts forward on its own, holds a fixed
 * height above whatever ground is beneath it, and hands the viewer steering,
 * throttle and a look-around on top. Reaching the far end turns it round
 * rather than stopping, so the scene never settles into a state where nothing
 * is happening.
 *
 * Height and aim both come from the drawn surface, which is why this needs the
 * valley: flying at a constant altitude over rolling ground means skimming the
 * hills and losing the hollows.
 */
const EDGE_MARGIN = 140;

export function createJourneyCamera(valley) {
  const camera = new PerspectiveCamera(CAMERA.FOV, 1, CAMERA.NEAR, CAMERA.FAR);
  const target = new Vector3();

  let travel = JOURNEY.TURN_MARGIN;
  let across = 0;
  let heading = 1;
  let speed = JOURNEY.DRIFT_SPEED;
  let yaw = 0;
  let pitch = 0;
  let height = valley.heightAt(0, travel) + CAMERA.HEIGHT;

  function advance(controls, dt) {
    const wanted =
      controls.forward === 0
        ? JOURNEY.DRIFT_SPEED
        : JOURNEY.DRIFT_SPEED + controls.forward * JOURNEY.FAST_SPEED;
    speed = damp(speed, controls.paused ? 0 : wanted, JOURNEY.SPEED_LAMBDA, dt);

    travel += speed * heading * dt;
    across = clamp(
      across + controls.strafe * JOURNEY.STRAFE_SPEED * dt,
      -WORLD.HALF_WIDTH + EDGE_MARGIN,
      WORLD.HALF_WIDTH - EDGE_MARGIN,
    );

    // Turn around at either end rather than stopping at a wall.
    const far = WORLD.LENGTH - JOURNEY.TURN_MARGIN;
    if (travel > far) {
      travel = far;
      heading = -1;
    } else if (travel < JOURNEY.TURN_MARGIN) {
      travel = JOURNEY.TURN_MARGIN;
      heading = 1;
    }
  }

  function aim(dt) {
    const ahead = CAMERA.LOOK_AHEAD;
    const lookX = clamp(
      across + Math.sin(yaw) * ahead * heading,
      -WORLD.HALF_WIDTH,
      WORLD.HALF_WIDTH,
    );
    const lookZ = clamp(travel + Math.cos(yaw) * ahead * heading, 0, WORLD.LENGTH);

    target.set(
      damp(target.x, lookX, CAMERA.LAMBDA, dt),
      damp(
        target.y,
        valley.heightAt(lookX, lookZ) + CAMERA.LOOK_HEIGHT + pitch * ahead,
        CAMERA.LAMBDA,
        dt,
      ),
      damp(target.z, lookZ, CAMERA.LAMBDA, dt),
    );
    camera.lookAt(target);
  }

  return {
    camera,

    update(controls, dt) {
      yaw = clamp(yaw + controls.look.x, -CAMERA.MAX_YAW, CAMERA.MAX_YAW);
      pitch = clamp(pitch + controls.look.y, CAMERA.MIN_PITCH, CAMERA.MAX_PITCH);

      advance(controls, dt);

      // Damped rather than snapped: the ground under the camera is a
      // heightfield, and following it exactly turns every facet into a jolt.
      height = damp(height, valley.heightAt(across, travel) + CAMERA.HEIGHT, CAMERA.LAMBDA, dt);
      camera.position.set(across, height, travel);
      aim(dt);
    },

    /**
     * Puts the flight somewhere along the valley immediately.
     *
     * Exists for the end-to-end tests and the console: waiting out five and a
     * half kilometres of drift to look at the desert is not a test, it is a
     * timeout. Nothing in the running scene calls it.
     */
    jumpTo({ x = across, z = travel } = {}) {
      across = clamp(x, -WORLD.HALF_WIDTH + EDGE_MARGIN, WORLD.HALF_WIDTH - EDGE_MARGIN);
      travel = clamp(z, JOURNEY.TURN_MARGIN, WORLD.LENGTH - JOURNEY.TURN_MARGIN);
      height = valley.heightAt(across, travel) + CAMERA.HEIGHT;
      target.set(across, height, travel);
    },

    setAspect(aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    },

    /** 0 at the forest end, 1 at the desert end. */
    get progress() {
      return travel / WORLD.LENGTH;
    },

    get state() {
      return { x: across, z: travel, heading, speed, yaw, pitch };
    },
  };
}
