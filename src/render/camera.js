import { PerspectiveCamera, Vector3 } from 'three';
import { CAMERA, JOURNEY } from '../config/render.js';
import { PATH, WORLD } from '../config/world.js';
import { pathCentre } from '../world/path.js';
import { clamp, damp } from '../core/math.js';

/**
 * The walk down the valley.
 *
 * The camera follows the trail rather than a straight line, at the eye level
 * of someone on it, and that single decision is what makes this a place rather
 * than a diorama: the path leads the eye, the trees close over it, and the
 * biome changes arrive as things noticed on the way rather than as a map.
 *
 * Steering is an offset from the trail, not a free position — you can walk on
 * the verge, or a little way into the trees, and the trail pulls you back if
 * you let go. That keeps the viewer somewhere the scene is composed for
 * without ever taking the controls away.
 */

/** How far off the trail the viewer may wander, in units. */
const WANDER_LIMIT = PATH.HALF_WIDTH + PATH.VERGE + 34;
/** How firmly the trail reclaims an unsteered camera, per second. */
const RECENTRE_LAMBDA = 0.35;

export function createJourneyCamera(valley) {
  const camera = new PerspectiveCamera(CAMERA.FOV, 1, CAMERA.NEAR, CAMERA.FAR);
  const target = new Vector3();

  let travel = JOURNEY.TURN_MARGIN;
  let offset = 0;
  let heading = 1;
  let speed = JOURNEY.DRIFT_SPEED;
  let yaw = 0;
  let pitch = 0;
  let height = valley.heightAt(pathCentre(travel), travel) + CAMERA.HEIGHT;
  camera.position.set(pathCentre(travel), height, travel);

  const acrossAt = (z, sideways) =>
    clamp(pathCentre(z) + sideways, -WORLD.HALF_WIDTH, WORLD.HALF_WIDTH);

  function advance(controls, dt) {
    const wanted =
      controls.forward === 0
        ? JOURNEY.DRIFT_SPEED
        : JOURNEY.DRIFT_SPEED + controls.forward * JOURNEY.FAST_SPEED;
    speed = damp(speed, controls.paused ? 0 : wanted, JOURNEY.SPEED_LAMBDA, dt);

    travel += speed * heading * dt;

    if (controls.strafe !== 0) {
      offset = clamp(
        offset + controls.strafe * JOURNEY.STRAFE_SPEED * dt,
        -WANDER_LIMIT,
        WANDER_LIMIT,
      );
    } else {
      offset = damp(offset, 0, RECENTRE_LAMBDA, dt);
    }

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

  /**
   * Where the view is aimed: a point on the trail's own centre line, further
   * along it.
   *
   * Down the trail rather than down the z axis, so a bend swings the whole view
   * with it and the path keeps running away from the viewer into the trees.
   * Aiming along the axis instead leaves the trail sliding out of frame on
   * every corner.
   */
  function aimPoint() {
    const ahead = clamp(travel + CAMERA.LOOK_AHEAD * heading, 0, WORLD.LENGTH);
    const lean = Math.sin(yaw) * CAMERA.LOOK_AHEAD * heading;
    const lookX = clamp(acrossAt(ahead, offset * 0.4) + lean, -WORLD.HALF_WIDTH, WORLD.HALF_WIDTH);
    const lookY = valley.heightAt(lookX, ahead) + CAMERA.LOOK_HEIGHT + pitch * CAMERA.LOOK_AHEAD;
    return { x: lookX, y: lookY, z: ahead };
  }

  /**
   * Eases the aim toward that point.
   *
   * `dt` of zero snaps instead, which is what the first frame and every jump
   * need: a camera easing in from wherever the vector happened to be
   * initialised spends its opening seconds pointed at the ground, and the
   * opening seconds are what sits behind the title card.
   */
  function aim(dt) {
    const wanted = aimPoint();
    if (dt <= 0) target.set(wanted.x, wanted.y, wanted.z);
    else {
      target.set(
        damp(target.x, wanted.x, CAMERA.LAMBDA, dt),
        damp(target.y, wanted.y, CAMERA.LAMBDA, dt),
        damp(target.z, wanted.z, CAMERA.LAMBDA, dt),
      );
    }
    camera.lookAt(target);
  }

  aim(0);

  return {
    camera,

    update(controls, dt) {
      yaw = clamp(yaw + controls.look.x, -CAMERA.MAX_YAW, CAMERA.MAX_YAW);
      pitch = clamp(pitch + controls.look.y, CAMERA.MIN_PITCH, CAMERA.MAX_PITCH);

      advance(controls, dt);

      const across = acrossAt(travel, offset);
      // Damped rather than snapped: the ground is a heightfield, and following
      // it exactly turns every facet into a jolt at head height.
      height = damp(height, valley.heightAt(across, travel) + CAMERA.HEIGHT, CAMERA.LAMBDA, dt);
      camera.position.set(across, height, travel);
      aim(dt);
    },

    /**
     * Puts the walk somewhere along the trail immediately.
     *
     * Exists for the end-to-end tests and the console: waiting out a kilometre
     * of valley at walking pace to look at the desert is not a test, it is a
     * timeout. Nothing in the running scene calls it.
     */
    jumpTo({ x, z = travel } = {}) {
      travel = clamp(z, JOURNEY.TURN_MARGIN, WORLD.LENGTH - JOURNEY.TURN_MARGIN);
      offset =
        x === undefined ? offset : clamp(x - pathCentre(travel), -WANDER_LIMIT, WANDER_LIMIT);
      const across = acrossAt(travel, offset);
      height = valley.heightAt(across, travel) + CAMERA.HEIGHT;
      camera.position.set(across, height, travel);
      aim(0);
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
      return { x: acrossAt(travel, offset), z: travel, heading, speed, yaw, pitch };
    },
  };
}
