# Buggy, handling and traffic

Three changes, in the order they should be built. Each names the files it
touches, the invariants it must not break, and how it is proved.

The harness rules from `CLAUDE.md` apply throughout and are not negotiable:
260-line files, 90-line functions, no `three` import under `src/world`,
`src/physics`, `src/content` or `src/core`, no raw subtraction of two world
coordinates, and every builder must still produce something complete with no
downloaded assets present.

## 1. The kart becomes a buggy

**Files:** `src/render/builders/kart.js`, `src/config/palette.js`,
possibly a new `src/render/geometry/buggy-shapes.js` if the builder passes
260 lines.

Today's procedural kart is a go-kart: a low slab body, a rear wing, four
equal 4.4-unit wheels, a driver sitting on top. A rally stage wants a dune
buggy. The silhouette to build:

- **Tube frame, not bodywork.** A roll cage of thin bars over an open
  floorpan, with a nose hoop and a rear hoop joined along the top. This is
  what reads as "buggy" from the chase camera at 40 units back — the cage
  breaks the sky behind the driver and nothing else in the scene does.
- **Staggered wheels.** Rear wheels visibly larger than the fronts
  (~6.0 vs ~4.8 radius) and wider, set outboard of the frame on visible
  stub axles, so the track width is wider than the body. This alone changes
  the read more than the cage does.
- **Raised stance.** Floorpan sitting clear of the ground with the axles
  below it, rather than a slab resting on its wheels.
- **Bucket seat, harness bar, roof-height light bar, rear-mounted spare.**
  The wing goes: buggies do not have one.
- **Front wheels steer.** `update` already receives `kart.steer`; turn the
  two front wheels about Y by `steer * MAX_STEER_ANGLE` (~0.42 rad) in
  addition to the existing roll spin. The spin axis must stay correct after
  the steer rotation, so each front wheel needs a steering pivot Group with
  the wheel mesh inside it.
- **Body roll stays.** `MAX_LEAN` may grow a little — a tall buggy leans
  more than a kart — but the chassis lean must not clip the wheels.

Keep the whole thing inside `KART_LENGTH = 30` and inside `KART.RADIUS = 15`
in plan view, or the picture and the collision circle drift apart.

New colours go in `KART_COLOURS` in `src/config/palette.js` (cage, floorpan,
light bar) — no hex literals in the builder.

`useModel` is untouched and still wins when `kit.rally.kart` has been
fetched: the procedural buggy is the no-assets default, which is rule 4.
Named-wheel spinning keeps working; a loaded model does not get steered
front wheels unless its wheels are named, which is the existing behaviour.

**Proved by:** `npm run e2e` still drawing a scene, plus a unit-level guard
is not available here (the builder imports `three`). Reviewer inspects the
geometry maths by hand.

## 2. Handling and acceleration

**Files:** `src/physics/kart.js`, `src/config/tuning.js`,
`src/input/input-state.js`, `src/input/keyboard.js`, `src/input/touch.js`,
`tests/kart.test.js`.

What is actually wrong today, in order of how much it is felt:

1. **The throttle is a step function.** `ACCELERATION = 210` against a drag
   of `0.35` implies a terminal speed of 600 while `MAX_SPEED` is 250, so
   the kart pins to the clamp in about a second and a half and then feels
   dead. There is no top end. Replace the constant force with a falloff:
   available thrust scales by `1 - (speed / topSpeed)` (clamped at zero), so
   the launch is harder than today and the last 15% of the speed range takes
   real time to find. `ACCELERATION` rises to compensate for the falloff;
   the reviewer should check the resulting 0-to-top time is still 4-6s.
2. **Brake and reverse are the same button.** Holding `brake` at a standstill
   silently rolls into reverse at `ACCELERATION * 0.5`, so a tap of the brake
   in a corner backs the buggy into the scenery. Split them: `brake` only
   decelerates; reverse engages only after the buggy has been stopped with
   brake held for `KART.REVERSE_DELAY` (~0.35 s). Track that as a
   `stoppedFor` accumulator on the state.
3. **Steering does not fall off with speed.** `authority` saturates at 1 at
   70 units/s and stays there to 380, so a full-lock input at boost speed
   is the same 2.5 rad/s it is at walking pace — which is why the buggy
   feels like it snaps around. Add a high-speed taper: multiply the turn
   rate by `lerp(1, KART.TURN_HIGH_SPEED_SCALE, clamp(speed / MAX_SPEED))`
   with the scale around 0.45. Low-speed authority ramp stays as it is.
4. **Reverse steering is inverted.** `sign(state.speed)` flips the turn
   direction below zero. That is correct for a real car and wrong for what
   the player expects from a keyboard. Keep the flip — it is defensible —
   but the reverse speed is low enough that the reviewer should confirm it
   is not the thing making reversing out of a hedge feel broken.
5. **Drift is decoration.** `input.drift` only scales the target slide. Make
   it a handbrake: while held, grip is multiplied by `KART.DRIFT_GRIP`
   (~0.6) for the steering and slide terms only — never for the surface
   lookup, which stays the ground's own property — and the slide decay
   lambda drops so the tail hangs out and recovers over ~0.5 s rather than
   snapping back.
6. **The stop deadzone eats a standing start.** `|speed| < 4` snaps to zero
   only when neither pedal is down, which is right, but the threshold and
   the reverse-delay accumulator must agree or the buggy jitters between
   creep and stop. Reset `stoppedFor` whenever speed leaves the deadzone.

Every new number is a named constant in `KART` in `src/config/tuning.js`
with a one-line comment. No magic numbers in `kart.js`.

Input: add a `reverse`-free binding set — no new keys are needed for the
above, but `Space` currently maps to `drift` alongside `Shift`. Leave the
bindings alone unless the handbrake change makes `Space` ambiguous.

**Proved by** new cases in `tests/kart.test.js`, all using `driveTrack` so
they measure the handling and not the map:

- accelerates hard from rest (first second covers more ground than the
  second second of a run already at speed does relative to its own gain);
- reaches within a few percent of `MAX_SPEED` given enough road, and takes
  longer to do the last stretch than the first;
- braking from speed does **not** produce a negative speed within
  `REVERSE_DELAY`;
- holding brake from a standstill for longer than `REVERSE_DELAY` does
  reverse;
- a full-lock turn at `MAX_SPEED` yields a smaller heading change per second
  than the same input at `TURN_AUTHORITY_SPEED`;
- holding `drift` through a corner produces more `|slide|` than the same
  corner without it, and the slide returns to near zero afterwards.

The existing kart tests are the regression net and must keep passing
unchanged — in particular "accelerates and then settles at a top speed",
"cannot be steered while stationary", "never comes to rest inside a
building" and the boost-pad case. If a tuning change breaks one of those,
the tuning is wrong, not the test.

## 3. The other vehicles move

**Files:** new `src/world/traffic.js`, `src/world/city.js`,
`src/world/street-furniture.js`, `src/game/session.js`,
`src/render/builders/cars.js`, `src/render/geometry/tiling.js`,
`src/render/scene.js`, new `tests/traffic.test.js`, `tests/city.test.js`.

Today `buildParkedCars` fills lay-bys with static boxes and
`city.colliders` is `[...scenery, ...cars]`. Two facts make this cheap:

- the collider list holds the **same object references** as `city.cars`, so
  moving a car's `x`/`z` moves what the physics collides with, with no
  rebuild and no change to `src/physics` at all;
- every position on a track line is `line + trackOffsetAt(along) + lane`, so
  a vehicle that advances `along` and re-derives its cross-axis coordinate
  stays exactly `lane` from the centre line forever, wobble included.

Design:

- `buildParkedCars` gains a companion `buildTraffic(rng)` in
  `src/world/traffic.js`. Some fraction of the bays (say half) become
  **moving** vehicles instead: same box shape, plus `axis` ('x' or 'z'),
  `direction` (+1/-1), `lane` (signed offset from the centre line, inside
  `ROAD_HALF`, on the correct side for the direction of travel), `speed`
  (drawn from the seeded rng, well below `KART.MAX_SPEED` — 60-110), and
  `along` (its progress).
- `createTraffic(cars)` returns `{ cars, update(dt) }`. `update` advances
  `along` by `speed * direction * dt`, wraps it, and writes `x`, `z` and
  `heading` back onto the same object. It is a pure function of accumulated
  time — no rng at runtime — so a fixed number of steps from a fixed seed is
  reproducible, and a test can assert that.
- `createCity` returns `traffic` alongside `cars`; `colliders` includes the
  moving vehicles the same way it includes the parked ones.
- `src/game/session.js` calls `city.traffic.update(dt)` inside `loop.step`,
  **before** `kart.update`, so the kart collides against this frame's
  positions and not last frame's.

Renderer:

- `tiledInstances` is build-time only. Add a sibling — `updateInstances(mesh,
items)` in `src/render/geometry/tiling.js` — that rewrites the matrices of
  an existing mesh from the same item shape, for the 3x3 tiling, and flags
  `instanceMatrix.needsUpdate`. Reuse the module's existing scratch
  `Matrix4`/`Vector3`/`Quaternion`; allocating per frame is the trap here.
- `buildCars` splits into a static mesh for the parked vehicles and a
  dynamic mesh for the moving ones, and returns
  `{ group, update(dt) }` rather than a bare `Group`. `update` re-seats each
  moving car with `seatOnGround` (they are few — tens, not hundreds) and
  applies `rotationY` from the car's heading. Cabins move with their bodies.
- `scene.js` holds the returned handle and calls `cars.update(dt)` from its
  own `update`.

Rules this must not break:

- **`src/world` stays renderer-free.** `traffic.js` imports `config`, `core`
  and `world/track.js` and nothing else.
- **`wrapDelta` / `wrap` only.** `along` wraps; the derived coordinates wrap.
- **The racing line stays clear.** `tests/city.test.js` asserts every parked
  vehicle leaves >20 units of lane and stays inside `ROAD_HALF`. Traffic must
  satisfy the same bound, and because `lane` is constant it satisfies it at
  every instant — the new test asserts exactly that after several hundred
  simulated steps, at a set of times, for every moving vehicle.
- **Determinism.** `tests/city.test.js` compares `JSON.stringify(city.cars)`
  between two builds. Whatever fields traffic adds must be seeded, and the
  test must keep passing as written.
- **The spawn stays clear.** No moving vehicle may start within a couple of
  kart radii of the spawn pose (`WORLD.BLOCK + trackOffsetAt(120), 120`) or
  the first frame of the game is a crash. Assert it.
- **Head-on traffic is on its own side.** A vehicle travelling toward -Z on
  a Z-axis line takes the opposite `lane` sign from one travelling toward
  +Z, so two never occupy the same strip.

**Proved by** `tests/traffic.test.js`: determinism across two builds, lane
distance held across time, wrapping (a vehicle driven a full world length
returns to its start), `colliders` seeing the moved position (resolve a
circle against a car before and after an update), and the spawn-clearance
case. Plus the existing suites unchanged.

## Order and gates

1, then 2, then 3 — each with `npm run check` green before the next starts.
`npm run check` runs lint, format, the boundary check, assets, unit tests and
the build; it is the gate, not a suggestion. `npm run e2e` once at the end.

## Out of scope

Traffic that reacts to the player, avoids obstacles, or brakes for the
kart. Gravity, suspension travel or any handling that reads terrain height —
that is the one rule the simulation is built on. Mud spray (roadmap item 1)
stays where it is.
