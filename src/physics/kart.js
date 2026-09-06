import { GRIP, KART } from '../config/tuning.js';
import { SURFACE, WORLD } from '../config/world.js';
import { clamp, damp, sign } from '../core/math.js';
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
    surface: SURFACE.TRACK,
    distance: 0,
    touchingLandmarkId: null,
  };
}

export function createKart({ city, emitter }) {
  const state = initialState();

  const reset = () => Object.assign(state, initialState());

  function applyThrottle(dt, input, grip, topSpeed) {
    if (input.accelerate) {
      state.speed += KART.ACCELERATION * grip * dt;
    } else if (input.brake) {
      state.speed -= (state.speed > 0 ? KART.BRAKING : KART.ACCELERATION * 0.5) * dt;
    }

    // Rolling resistance, heavier off-road and heavier the faster you go.
    const drag = (1 - grip) * 2.2 + 0.35;
    state.speed -= state.speed * drag * dt;

    if (state.boost > 0 && state.speed < topSpeed) {
      state.speed = damp(state.speed, topSpeed, 6, dt);
    }

    state.speed = clamp(state.speed, -KART.REVERSE_MAX, topSpeed);
    if (!input.accelerate && !input.brake && Math.abs(state.speed) < 4) state.speed = 0;
  }

  function applySteering(dt, input, grip) {
    const wanted = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    state.steer = damp(state.steer, wanted, 9, dt);

    // You cannot turn a kart that is not moving.
    const authority =
      Math.min(1, Math.abs(state.speed) / KART.TURN_AUTHORITY_SPEED) * (sign(state.speed) || 1);
    const turn = state.steer * KART.TURN_RATE * authority * (0.55 + grip * 0.45);
    state.heading += turn * dt;

    // Drift: hard cornering at speed pushes the kart sideways. The slide decays
    // back to zero rather than being simulated properly, which is the whole
    // reason it feels like an arcade racer.
    const wantedSlide = -turn * (state.speed / KART.MAX_SPEED) * 26 * (input.drift ? 2.4 : 1);
    state.slide = damp(state.slide, wantedSlide, 5, dt);
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
