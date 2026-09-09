import { WAYPOINTS, WAYPOINT_NAMES } from './waypoints.mjs';

/**
 * Command line for `npm run shoot`.
 *
 * Positional arguments are waypoint names; everything else is a flag. With no
 * positionals it shoots the lot, which is the case that matters — the reason
 * this exists is to see the whole journey change at once rather than one
 * corner of it.
 */
const USAGE = `
npm run shoot [waypoint...] [options]

  Waypoints: ${WAYPOINT_NAMES.join(', ')}   (default: all of them)

  --at z=1500,x=-40   shoot an arbitrary spot as well; repeatable
  --width <px>        frame width  (default 1280)
  --height <px>       frame height (default 720)
  --settle <ms>       time to let the frame converge (default 2500)
  --out <dir>         where to write   (default shots)
  --tier <name>       force a quality tier: low | medium | high
  --dev               shoot the running dev server instead of building
  --port <n>          port of the server to shoot (default 4173, or 5173 with --dev)
  --catalogue         render every model on its own instead of the valley
  --models <dir>      where the catalogue looks for .glb (default public/assets/models)
  --help
`;

const FLAGS_WITH_VALUES = new Set([
  'at',
  'width',
  'height',
  'settle',
  'out',
  'tier',
  'port',
  'models',
]);
const TIERS = new Set(['low', 'medium', 'high']);

export function parseArgs(argv) {
  const options = {
    shots: [],
    width: 1280,
    height: 720,
    settle: 2500,
    out: 'shots',
    tier: null,
    dev: false,
    port: null,
    catalogue: false,
    models: 'public/assets/models',
    help: false,
  };
  const named = [];
  const extra = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      named.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (key === 'help') options.help = true;
    else if (key === 'dev') options.dev = true;
    else if (key === 'catalogue') options.catalogue = true;
    else if (FLAGS_WITH_VALUES.has(key)) {
      i += 1;
      const value = argv[i];
      if (value === undefined) throw new Error(`--${key} needs a value`);
      if (key === 'at') extra.push(parseAt(value));
      else options[key] = value;
    } else throw new Error(`Unknown option --${key}\n${USAGE}`);
  }

  return finish(options, named, extra);
}

/** `z=1500,x=-40` — z is required, x optional. */
function parseAt(value) {
  const spot = {};
  for (const pair of value.split(',')) {
    const [key, raw] = pair.split('=');
    const number = Number(raw);
    if (!['x', 'z'].includes(key) || !Number.isFinite(number)) {
      throw new Error(`--at wants z=<number> and optionally x=<number>, got "${value}"`);
    }
    spot[key] = number;
  }
  if (spot.z === undefined) throw new Error(`--at needs a z, got "${value}"`);
  return {
    ...spot,
    name: `at-z${spot.z}${spot.x === undefined ? '' : `-x${spot.x}`}`,
    note: 'Ad hoc',
  };
}

function finish(options, named, extra) {
  for (const name of named) {
    if (!WAYPOINTS[name]) {
      throw new Error(`Unknown waypoint "${name}". Try: ${WAYPOINT_NAMES.join(', ')}`);
    }
  }
  const chosen = named.length > 0 || extra.length > 0 ? named : WAYPOINT_NAMES;
  options.shots = [...chosen.map((name) => ({ name, ...WAYPOINTS[name] })), ...extra];

  options.width = positive(options.width, 'width');
  options.height = positive(options.height, 'height');
  options.settle = positive(options.settle, 'settle');
  options.port = Number(options.port ?? (options.dev ? 5173 : 4173));
  if (options.tier !== null && !TIERS.has(options.tier)) {
    throw new Error(`--tier wants one of ${[...TIERS].join(', ')}, got "${options.tier}"`);
  }
  return options;
}

function positive(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`--${name} wants a positive number`);
  return Math.round(number);
}

export { USAGE };
