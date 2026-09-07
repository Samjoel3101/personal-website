import { GRIP, KART } from '../config/tuning.js';
import { SURFACE, WORLD } from '../config/world.js';
import { clamp, damp, lerp, sign } from '../core/math.js';
import { wrap } from '../core/torus.js';
import { trackOffsetAt } from '../world/track.js';
import { resolveAll } from './collision.js';

/**
 * Arcade kart handling.
 *
 * Deliberately not a simulation. Speed is a scalar along the heading, the turn
 * rate scales with how fast you are already going, and grip is read off the
 * ground underneath. Two hundred lines of Newton would drive worse than this.
 *
 * Emits `kart:bump` on a wall hit and `kart:boost` when a pad fires, so audio
 * and the camera can react without this module knowing they exist.
 */
/**
 * Starting pose: on the track, one block in, pointing along +Z.
 *
 * The x offset is not decoration. The track snakes, so the grid line at
 * x = BLOCK is a ditch at z = 120; trackOffsetAt puts the kart on the dirt.
 * tests/city.test.js asserts surfaceAt(spawn) === SURFACE.TRACK.
 */
const SPAWN_Z = 120;

function initialState() {
  return {
    x: wrap(WORLD.BLOCK + trackOffsetAt(SPAWN_Z)),
    z: SPAWN_Z,
    heading: 0, // radians; 0 points along +Z
    speed: 0,
    steer: 0, // smoothed input, -1..1, drives the lean of the model
    slide: 0, // lateral drift velocity
    boost: 0, // seconds of boost remaining
    stoppedFor: 0, // seconds spent below STOP_SPEED, for the reverse delay
    surface: SURFACE.TRACK,
    distance: 0,
    touchingLandmarkId: null,
  };
}

export function createKart({ city, emitter }) {
  const state = initialState();

  const reset = () => Object.assign(state, initialState());

  /**
   * Throttle, brake and reverse.
   *
   * Available thrust falls off toward the top speed rather than being a
   * constant fighting a big drag term. That is what gives the buggy a launch
   * and a top end instead of pinning it to the clamp in a second and a half:
   * the last tenth of the speed range takes as long to find as the first half.
   *
   * Brake and reverse are separate. The brake only ever slows; reverse engages
   * once the buggy has stood still with the brake held for REVERSE_DELAY, so a
   * dab of the brake mid-corner cannot back it into the scenery.
   */
  function applyThrottle(dt, input, grip, topSpeed) {
    const moving = Math.abs(state.speed) >= KART.STOP_SPEED;
    state.stoppedFor = moving ? 0 : state.stoppedFor + dt;

    if (input.accelerate) {
      const headroom = clamp(1 - state.speed / topSpeed, 0, 1);
      state.speed += KART.ACCELERATION * grip * headroom * dt;
    } else if (input.brake) {
      applyBrake(dt, grip);
    }

    const drag =
      KART.DRAG + (1 - grip) * KART.OFFROAD_DRAG + (input.accelerate ? 0 : KART.COAST_DRAG);
    state.speed -= state.speed * drag * dt;

    if (state.boost > 0 && state.speed < topSpeed) {
      state.speed = damp(state.speed, topSpeed, KART.BOOST_LAMBDA, dt);
    }

    state.speed = clamp(state.speed, -KART.REVERSE_MAX, topSpeed);
    if (!input.accelerate && !input.brake && Math.abs(state.speed) < KART.STOP_SPEED) {
      state.speed = 0;
    }
  }

  function applyBrake(dt, grip) {
    if (state.speed > 0) {
      // All the way to rest, including the creep below STOP_SPEED: the
      // deadzone snap only fires with both pedals up, and a buggy that keeps
      // rolling under braking is worse than one that keeps rolling coasting.
      state.speed = Math.max(0, state.speed - KART.BRAKING * dt);
      return;
    }
    // Already rolling backwards, or stood on the brake long enough to select
    // reverse: from here the brake is the reverse pedal.
    if (state.speed < -KART.STOP_SPEED || state.stoppedFor >= KART.REVERSE_DELAY) {
      state.speed -= KART.REVERSE_ACCELERATION * grip * dt;
    }
  }

  function applySteering(dt, input, grip) {
    const wanted = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    state.steer = damp(state.steer, wanted, KART.STEER_LAMBDA, dt);

    // The handbrake breaks traction for the cornering terms only. The surface
    // lookup keeps the ground's own grip: dirt does not get slippery because
    // you pulled a lever.
    const cornering = grip * (input.drift ? KART.DRIFT_GRIP : 1);

    // You cannot turn a kart that is not moving, and a kart at 250 should not
    // turn as hard as one at 70 — that is what made it feel like it snapped
    // around rather than being driven.
    const authority =
      Math.min(1, Math.abs(state.speed) / KART.TURN_AUTHORITY_SPEED) * (sign(state.speed) || 1);
    const taper = lerp(
      1,
      KART.TURN_HIGH_SPEED_SCALE,
      clamp(Math.abs(state.speed) / KART.MAX_SPEED, 0, 1),
    );
    const turn = state.steer * KART.TURN_RATE * authority * (0.55 + cornering * 0.45) * taper;
    state.heading += turn * dt;

    // Drift: hard cornering at speed pushes the kart sideways. The slide decays
    // back to zero rather than being simulated properly, which is the whole
    // reason it feels like an arcade racer.
    const slack = input.drift ? KART.DRIFT_SLIDE : 1;
    const wantedSlide = -turn * (state.speed / KART.MAX_SPEED) * KART.SLIDE_SCALE * slack;
    const lambda = input.drift ? KART.DRIFT_SLIDE_LAMBDA : KART.SLIDE_LAMBDA;
    state.slide = damp(state.slide, wantedSlide, lambda, dt);
  }

  function integrate(dt) {
    const sin = Math.sin(state.heading);
    const cos = Math.cos(state.heading);
    state.x = wrap(state.x + (sin * state.speed + cos * state.slide) * dt);
    state.z = wrap(state.z + (cos * state.speed - sin * state.slide) * dt);
    state.distance += Math.abs(state.speed) * dt;
  }

  function collide() {
    const result = resolveAll(state.x, state.z, KART.RADIUS, city.colliders);
    state.x = result.x;
    state.z = result.z;
    state.touchingLandmarkId = result.landmarkId;

    if (!result.contact) return;

    // Kill only the component of motion heading into the wall.
    const into =
      Math.sin(state.heading) * result.contact.normalX +
      Math.cos(state.heading) * result.contact.normalZ;
    if (into >= 0) return;

    const speedBefore = Math.abs(state.speed);
    state.speed *= 0.35 + 0.4 * (1 + into);
    state.slide *= 0.3;
    if (speedBefore > 45) emitter.emit('kart:bump', { speed: speedBefore });
  }

  function update(dt, input) {
    state.surface = city.surfaceAt(state.x, state.z);
    const grip = GRIP[state.surface] ?? 1;

    if (state.surface === SURFACE.BOOST && state.speed > 30 && state.boost < 0.4) {
      state.boost = KART.BOOST_DURATION;
      emitter.emit('kart:boost');
    }
    if (state.boost > 0) state.boost = Math.max(0, state.boost - dt);

    const topSpeed = (state.boost > 0 ? KART.BOOST_SPEED : KART.MAX_SPEED) * grip;
    applyThrottle(dt, input, grip, topSpeed);
    applySteering(dt, input, grip);
    integrate(dt);
    collide();
  }

  /** Speed in fictional km/h, for the HUD. */
  const speedKph = () => Math.round(Math.abs(state.speed) * 0.72);

  return { state, update, reset, speedKph };
}
