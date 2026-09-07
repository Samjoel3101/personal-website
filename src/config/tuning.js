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
  /** Thrust at a standstill. It falls off linearly toward the top speed, so
   *  this number is the launch, not the cruise: raising it shortens the first
   *  second and barely moves the last twenty units per hour. */
  ACCELERATION: 320,
  BRAKING: 400,
  /** Reverse is its own gear, and a slow one. */
  REVERSE_ACCELERATION: 105,
  REVERSE_MAX: 90,
  /** How long the brake must be held at a standstill before reverse engages.
   *  Without it, a tap of the brake in a corner backs you into the scenery. */
  REVERSE_DELAY: 0.35,
  /** Below this the buggy is treated as stopped: it snaps to rest with no
   *  pedal down, and the reverse delay starts counting. */
  STOP_SPEED: 4,
  /** Rolling resistance under power. Small, because the throttle falloff is
   *  what sets the top speed now; a big drag term here would drag the whole
   *  acceleration curve into the first second again. */
  DRAG: 0.012,
  /** Extra resistance with the throttle released, so lifting off actually
   *  slows the buggy rather than letting it coast forever. */
  COAST_DRAG: 0.33,
  /** Extra resistance per unit of missing grip: the off-road penalty. */
  OFFROAD_DRAG: 2.2,
  TURN_RATE: 2.5,
  /** Speed at which steering reaches full authority. */
  TURN_AUTHORITY_SPEED: 70,
  /** Fraction of the turn rate left at MAX_SPEED. Full lock at speed used to
   *  be as sharp as full lock at walking pace, which is what made the buggy
   *  feel like it snapped around. */
  TURN_HIGH_SPEED_SCALE: 0.45,
  /** How fast the steering input itself follows the key. */
  STEER_LAMBDA: 9,
  /** Handbrake: grip multiplier applied to the turn and slide terms while
   *  drift is held. Never to the surface lookup — that is the ground's. */
  DRIFT_GRIP: 0.6,
  /** How much further the tail steps out with the handbrake down. */
  DRIFT_SLIDE: 2.4,
  /** Lateral velocity at full lock and full speed. */
  SLIDE_SCALE: 26,
  SLIDE_LAMBDA: 5,
  /** Slower while drifting, so the tail hangs rather than snapping back. */
  DRIFT_SLIDE_LAMBDA: 2.2,
  /** How quickly a boost pad pulls the buggy up to the boosted top speed. */
  BOOST_LAMBDA: 6,
  /** Collision radius. */
  RADIUS: 15,
  /** Seconds of boost granted by a pad. */
  BOOST_DURATION: 1.15,
});

/** Grip and top-speed multiplier per surface, keyed by SURFACE value. */
export const GRIP = Object.freeze([
  1.0, // TRACK
  0.8, // VERGE — the grass shoulder nibbles at your speed
  0.95, // PADDOCK
  0.55, // FIELD — open meadow really punishes you, which makes the track a choice
  1.0, // BOOST
  0.4, // MUD — a puddle. The one place worth steering around.
]);

/** Physics runs at a fixed rate so handling is identical on any display. */
export const PHYSICS_HZ = 120;

/** Largest frame delta the loop will integrate, to stop a backgrounded tab
 *  tunnelling the kart through a wall on the first frame back. */
export const MAX_FRAME_SECONDS = 0.1;

/**
 * Moving traffic. Slow enough that catching and passing one is the normal
 * outcome — a service truck the kart cannot get past is a wall, not a car.
 */
export const TRAFFIC = Object.freeze({
  /** Fraction of the occupied lay-bys that pull out and drive instead. */
  SHARE: 0.5,
  /** Signed offset from the track centre line, matching the lay-by lane so a
   *  moving vehicle leaves the same racing line a parked one does. */
  LANE: 35,
  SPEED_MIN: 60,
  SPEED_MAX: 110,
});
