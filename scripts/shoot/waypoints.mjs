/**
 * Where the camera stands for a shot.
 *
 * One place, because the whole point of this tool is that two runs a week
 * apart are comparable: a waypoint that drifts is a before/after that proves
 * nothing. `z` is distance down the valley (0 forest, 5600 desert) and maps
 * onto the journey anchors in src/config/world.js; `x` is left off wherever
 * the trail's own wander should decide it, which is most of them.
 *
 * `reference` names the frame in docs/reference/ this shot is trying to match.
 * The contact sheet puts them side by side, and an empty one just means we
 * have no reference for that part of the valley yet.
 */
export const WAYPOINTS = Object.freeze({
  forest: {
    z: 600,
    note: 'Deep pine forest, on the trail',
    reference: 'forest-path-summer.jpg',
  },
  pond: {
    z: 900,
    x: -250,
    note: 'The forest pond, from its bank',
    reference: 'forest-path-summer.jpg',
  },
  woodland: {
    z: 2464,
    note: 'Thinning woodland — the journey anchor',
    reference: 'forest-clearing-autumn.jpg',
  },
  scrub: {
    z: 4032,
    note: 'Dry scrub, on the way out',
    reference: 'forest-clearing-autumn.jpg',
  },
  oasis: {
    z: 4600,
    x: 260,
    note: 'The oasis, from its bank',
    reference: 'desert-wash-bare-trees.jpg',
  },
  desert: {
    z: 5320,
    note: 'Open desert — the journey anchor',
    reference: 'desert-wash-bare-trees.jpg',
  },
});

export const WAYPOINT_NAMES = Object.freeze(Object.keys(WAYPOINTS));
