import { BoxGeometry, CylinderGeometry, SphereGeometry } from 'three';
import { KART_COLOURS } from '../../config/palette.js';
import { mergeParts } from './merge.js';
import { paintGeometry } from './paint.js';

/**
 * The shape of the dune buggy, as geometry only.
 *
 * Split out of builders/kart.js because that module is about the kart's
 * interface to the rest of the renderer — spinning wheels, steering, swapping
 * in a downloaded model — and this is about where the tubes go. Everything is
 * authored in the kart's own frame: +Z is forward, y = 0 is the ground.
 *
 * The silhouette is doing the work. From forty units back the buggy is read
 * from its outline: an open cage breaking the sky, and rear wheels visibly
 * bigger than the fronts and set outboard of the frame. A closed body at this
 * distance reads as the go-kart this replaced.
 */

/** Wheel sizes and stations. Staggered on purpose: the rear pair is the single
 *  strongest cue that this is a buggy and not a kart. */
export const BUGGY = Object.freeze({
  FRONT: { RADIUS: 4.8, WIDTH: 3.4, X: 9.8, Z: 9.5 },
  REAR: { RADIUS: 6.0, WIDTH: 5.0, X: 10.4, Z: -9.0 },
  /** Radians the front wheels turn at full lock. */
  MAX_STEER_ANGLE: 0.42,
  /**
   * Height the chassis rolls about.
   *
   * Rolling about the ground plane swings anything tall a long way sideways —
   * at 0.2 rad a point ten units up moves two units out, straight into a tyre.
   * A roll axis at floorpan height keeps the body between its own wheels at
   * full lock and full lean, which the clearance is otherwise too tight for.
   */
  ROLL_CENTRE: 8,
});

const TUBE = 1.4;

/** A wheel: a cylinder laid over so it spins about X. */
export function wheelGeometry(radius, width) {
  const geometry = new CylinderGeometry(radius, radius, width, 14);
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}

/** A stub axle reaching out from the frame to a wheel hub. */
export function axleGeometry(length) {
  const geometry = new CylinderGeometry(1, 1, length, 8);
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}

/**
 * Floorpan, cage, seat, driver and the rear-mounted spare, merged into one
 * vertex-coloured mesh. One draw call, ten colours.
 */
export function buggyBodyGeometry() {
  const parts = [];
  const add = (geometry, colour, position) => {
    geometry.translate(...position);
    parts.push(paintGeometry(geometry, colour));
  };

  addFloorpan(add);
  addCage(add);
  addOccupant(add);
  add(spareWheel(), KART_COLOURS.TYRE, [0, 12, -13.2]);

  return mergeParts(parts, 'buggy-body');
}

/**
 * The floorpan and its nose, sitting clear of the ground.
 *
 * Raised stance: the pan's underside is above the wheel centres, so the axles
 * hang below it rather than the body resting on its tyres.
 */
function addFloorpan(add) {
  add(new BoxGeometry(12, 1.6, 20), KART_COLOURS.FLOORPAN, [0, 6.6, -2]);
  add(new BoxGeometry(10, 2.2, 7), KART_COLOURS.FLOORPAN, [0, 7.2, 11]);
  // The sills stop short of the front wheels on purpose: a wheel at full lock
  // sweeps inboard of its own hub by a third of its diameter.
  for (const side of [-1, 1]) {
    add(new BoxGeometry(1.6, 3, 18), KART_COLOURS.BODY, [side * 5.4, 8.2, -3]);
  }
  // Nose hoop: a bumper the shape of the cage, so the front reads as tube too.
  for (const side of [-1, 1]) {
    add(new BoxGeometry(TUBE, 6, TUBE), KART_COLOURS.CAGE, [side * 5, 9.5, 13.6]);
  }
  add(new BoxGeometry(11.4, TUBE, TUBE), KART_COLOURS.CAGE, [0, 12.5, 13.6]);
}

/** The roll cage: two hoops, sloping roof rails, braces and the light pod. */
function addCage(add) {
  for (const side of [-1, 1]) {
    add(new BoxGeometry(TUBE, 13, TUBE), KART_COLOURS.CAGE, [side * 6, 13.5, -6]);
    add(new BoxGeometry(TUBE, 10, TUBE), KART_COLOURS.CAGE, [side * 5.8, 12, 6.5]);
    add(roofRail(), KART_COLOURS.CAGE, [side * 5.9, 18.5, 0.25]);
    add(rearBrace(), KART_COLOURS.CAGE, [side * 6, 13.5, -9]);
  }
  add(new BoxGeometry(13.4, TUBE, TUBE), KART_COLOURS.CAGE, [0, 20, -6]);
  add(new BoxGeometry(13, TUBE, TUBE), KART_COLOURS.CAGE, [0, 17, 6.5]);
  // Harness bar, across the driver's shoulders.
  add(new BoxGeometry(12, 1.2, 1.2), KART_COLOURS.CAGE, [0, 13.2, -5.4]);

  add(new BoxGeometry(15, 2.2, 2.4), KART_COLOURS.LIGHT_BAR, [0, 18.3, 6.6]);
  for (const x of [-5.2, -1.8, 1.8, 5.2]) {
    add(new BoxGeometry(2.6, 1.6, 0.6), KART_COLOURS.LIGHT_LENS, [x, 18.3, 7.9]);
  }
}

/** Bucket seat and the driver in it. */
function addOccupant(add) {
  add(new BoxGeometry(8, 1.6, 8), KART_COLOURS.BODY_DARK, [0, 8.2, -1.5]);
  add(new BoxGeometry(8, 9, 1.8), KART_COLOURS.BODY_DARK, [0, 12.5, -5.4]);
  add(new BoxGeometry(7, 7, 5), KART_COLOURS.SUIT, [0, 12, -1.6]);
  add(new SphereGeometry(3.6, 12, 10), KART_COLOURS.HELMET, [0, 15.8, -2]);
}

/**
 * A roof rail joining the two hoops.
 *
 * The rear hoop is taller than the front one, so the rail slopes: the box is
 * cut to the diagonal and rotated to land on both tops. Get the angle wrong
 * and the rails float off the hoops by a tube's width, which is exactly the
 * detail the silhouette is made of.
 */
function roofRail() {
  const geometry = new BoxGeometry(TUBE, TUBE, 12.85);
  geometry.rotateX(Math.asin(3 / 12.85));
  return geometry;
}

/** Diagonal from the rear hoop's shoulder down to the tail of the floorpan. */
function rearBrace() {
  const geometry = new BoxGeometry(TUBE, TUBE, 12.6);
  geometry.rotateX(Math.atan2(-11, 6));
  return geometry;
}

/** The spare, bolted to the tail: a wheel lying in the XY plane. */
function spareWheel() {
  const geometry = new CylinderGeometry(5, 5, 3.2, 14);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}
