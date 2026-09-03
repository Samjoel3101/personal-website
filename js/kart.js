/* kart.js — arcade kart physics.

   Deliberately not a simulation. The handling model is the one arcade racers
   have used for thirty years: a scalar speed along the heading, a turn rate
   that scales with how fast you are already going, and a grip coefficient
   read off the ground underneath you. Two hundred lines of Newton would drive
   worse than this does. */

const Kart = {
  x: 0, z: 0, a: 0,
  speed: 0,
  steer: 0,          // smoothed steering input, -1..1, drives the lean sprite
  slide: 0,          // lateral drift velocity
  boost: 0,          // seconds of boost remaining
  surface: K.SURF.ROAD,
  bumped: 0,         // set on a wall hit, consumed by audio/shake
  hitLandmark: null, // landmark id whose wall we are touching, if any
  boosted: 0,        // set when a pad fires, consumed by audio
  distance: 0,

  /* Per-surface grip and top-speed multipliers. Kerbs nibble at your speed,
     dirt lots really punish you — which is what makes staying on the road a
     choice rather than a formality. */
  GRIP: {
    [K.SURF.ROAD]: 1.0,
    [K.SURF.BOOST]: 1.0,
    [K.SURF.PLAZA]: 0.92,
    [K.SURF.WALK]: 0.74,
    [K.SURF.GRASS]: 0.48
  },

  reset() {
    this.x = K.BLOCK;          // on the road, one block in
    this.z = 120;
    this.a = 0;                // heading 0 is +Z
    this.speed = 0; this.steer = 0; this.slide = 0;
    this.boost = 0; this.distance = 0;
    this.surface = K.SURF.ROAD;
  },

  update(dt, input) {
    /* --- steering input, smoothed so keyboard taps are not binary --- */
    const want = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    this.steer += (want - this.steer) * Math.min(1, dt * 9);

    this.surface = City.surfaceAt(this.x, this.z);
    const grip = this.GRIP[this.surface] ?? 1;

    /* --- boost pads --- */
    if (this.surface === K.SURF.BOOST && this.speed > 30 && this.boost < 0.4) {
      this.boost = 1.15;
      this.boosted = 1;
    }
    if (this.boost > 0) this.boost = Math.max(0, this.boost - dt);

    const topSpeed = (this.boost > 0 ? K.BOOST_SPEED : K.MAX_SPEED) * grip;

    /* --- longitudinal --- */
    if (input.gas) {
      this.speed += K.ACCEL * grip * dt;
    } else if (input.brake) {
      this.speed -= (this.speed > 0 ? K.BRAKE : K.ACCEL * 0.5) * dt;
    }
    /* rolling resistance, heavier off-road and heavier the faster you go */
    const drag = (1 - grip) * 2.2 + 0.35;
    this.speed -= this.speed * drag * dt;
    if (this.boost > 0 && this.speed < topSpeed) {
      this.speed += (topSpeed - this.speed) * Math.min(1, dt * 6);
    }
    this.speed = clamp(this.speed, -90, topSpeed);
    if (!input.gas && !input.brake && Math.abs(this.speed) < 4) this.speed = 0;

    /* --- heading: you cannot turn a kart that is not moving --- */
    const authority = Math.min(1, Math.abs(this.speed) / 70) * Math.sign(this.speed || 1);
    const turn = this.steer * K.TURN * authority * (0.55 + grip * 0.45);
    this.a += turn * dt;

    /* --- drift: hard cornering at speed pushes the kart sideways, and the
           slide decays back to zero rather than being simulated properly --- */
    const slideWant = -turn * (this.speed / K.MAX_SPEED) * 26 * (input.drift ? 2.4 : 1);
    this.slide += (slideWant - this.slide) * Math.min(1, dt * 5);

    /* --- integrate --- */
    const sin = Math.sin(this.a), cos = Math.cos(this.a);
    const nx = this.x + (sin * this.speed + cos * this.slide) * dt;
    const nz = this.z + (cos * this.speed - sin * this.slide) * dt;
    this.x = wrap(nx);
    this.z = wrap(nz);
    this.distance += Math.abs(this.speed) * dt;

    this.hitLandmark = this.collide();
  },

  /* Circle-vs-AABB against every ground-level box. ~90 boxes, so a flat scan
     beats the bookkeeping of a broadphase. Returns the landmark id that was
     hit, if any, so bumping into a landmark counts as finding it. */
  collide() {
    const r = 15;
    let hit = null;
    for (const b of City.buildings) {
      if (b.y0 > 0) continue;                 // spires and awnings are overhead
      const dx = wrapDelta(this.x - b.x), dz = wrapDelta(this.z - b.z);
      if (Math.abs(dx) > b.hw + r || Math.abs(dz) > b.hd + r) continue;

      const cx = clamp(dx, -b.hw, b.hw), cz = clamp(dz, -b.hd, b.hd);
      let nx = dx - cx, nz = dz - cz;
      let dist = Math.hypot(nx, nz);

      if (dist === 0) {
        /* Centre is inside the box: eject along the shallowest axis. */
        const px = b.hw - Math.abs(dx), pz = b.hd - Math.abs(dz);
        if (px < pz) { nx = Math.sign(dx) || 1; nz = 0; dist = -px; }
        else { nx = 0; nz = Math.sign(dz) || 1; dist = -pz; }
      } else if (dist >= r) {
        continue;
      } else {
        nx /= dist; nz /= dist;
      }

      const push = r - dist;
      this.x = wrap(this.x + nx * push);
      this.z = wrap(this.z + nz * push);

      /* Kill the component of motion heading into the wall. */
      const sin = Math.sin(this.a), cos = Math.cos(this.a);
      const into = sin * nx + cos * nz;
      if (into < 0) {
        this.speed *= 0.35 + 0.4 * (1 + into);
        this.slide *= 0.3;
        if (Math.abs(this.speed) > 45) this.bumped = 1;
      }
      if (b.landmark) hit = b.landmark;
    }
    return hit;
  },

  /* Speed in fictional km/h, for the HUD. */
  get kph() { return Math.round(Math.abs(this.speed) * 0.72); }
};
