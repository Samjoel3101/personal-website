/**
 * Kart handling. Deliberately not a simulation: a scalar speed along the
 * heading, a turn rate that scales with how fast you are already going, and a
 * grip coefficient read from the ground underneath. Two hundred lines of
 * Newton would drive worse than this does.
 *
 * All values are per second unless noted.
 */
export const KART = Object.freeze({
  MAX_SPEED: 250,
  BOOST_SPEED: 380,
  ACCELERATION: 210,
  BRAKING: 400,
  REVERSE_MAX: 90,
  TURN_RATE: 2.5,
  /** Speed at which steering reaches full authority. */
  TURN_AUTHORITY_SPEED: 70,
  /** Collision radius. */
  RADIUS: 15,
  /** Seconds of boost granted by a pad. */
  BOOST_DURATION: 1.15,
});

/** Grip and top-speed multiplier per surface, keyed by SURFACE value. */
export const GRIP = Object.freeze([
  1.0, // ROAD
  0.74, // WALK — kerbs nibble at your speed
  0.92, // PLAZA
  0.48, // GRASS — dirt really punishes you, which makes the road a choice
  1.0, // BOOST
]);

/** Physics runs at a fixed rate so handling is identical on any display. */
export const PHYSICS_HZ = 120;

/** Largest frame delta the loop will integrate, to stop a backgrounded tab
 *  tunnelling the kart through a wall on the first frame back. */
export const MAX_FRAME_SECONDS = 0.1;
