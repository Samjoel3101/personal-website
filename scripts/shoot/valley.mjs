import { setTimeout as delay } from 'node:timers/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** A frame here takes the best part of a second; the default 30 s is not enough. */
const SHOT_TIMEOUT = 180_000;

/**
 * Shooting the valley itself.
 *
 * One page for the whole run. Booting costs about thirteen seconds — three of
 * them generating the valley and the rest compiling shaders on a software
 * rasteriser — so a tool that reloaded per waypoint would spend ten times as
 * long booting as shooting, and the six-shot run this is built around would
 * take two minutes instead of twenty seconds.
 */
export async function bootValley(page, url, { tier, settle }) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#intro', { state: 'visible', timeout: 120_000 });
  await page.click('#begin');
  await page.waitForFunction(() => window.__valley?.debug?.running === true, null, {
    timeout: 60_000,
  });

  if (tier) {
    const pinned = await page.evaluate((name) => window.__valley.debug.forceQuality(name), tier);
    if (!pinned) console.warn(`  ! could not pin quality tier "${tier}"`);
  }

  // The optional models land asynchronously, long after the first frame. A
  // shot taken before they arrive is a picture of the procedural fallback,
  // which is a real thing worth shooting but never the thing you meant.
  await page
    .waitForFunction(() => window.__valley.debug.models.wanted > 0, null, { timeout: 30_000 })
    .catch(() => console.warn('  ! no models reported; shooting the procedural fallback'));
  // The HUD, the biome card and the control hints are chrome, and this tool
  // exists to judge the scenery behind them. Hidden in CSS rather than by
  // pausing the session, so the frame is the one the viewer really gets.
  await page.addStyleTag({ content: '#hud, #intro, #loading { display: none !important; }' });
  await delay(settle);
}

export async function shootValley(page, shot, options) {
  await page.evaluate(
    ({ z, x }) => window.__valley.stage.jumpTo(x === undefined ? { z } : { z, x }),
    { z: shot.z, x: shot.x },
  );
  // The camera eases toward a jump rather than snapping to it, and on a
  // software renderer "a few frames" is a few seconds of wall clock.
  await delay(options.settle);

  const file = path.join(options.out, `${shot.name}.png`);
  await mkdir(path.dirname(file), { recursive: true });
  // Generous, and not arbitrary: Playwright waits for the page to hold still
  // before it captures, and a scene with a render loop on a software
  // rasteriser never does. The default 30 s expires mid-frame.
  await page.screenshot({ path: file, timeout: SHOT_TIMEOUT, animations: 'allow' });

  const debug = await page.evaluate(() => ({
    models: window.__valley.debug.models,
    triangles: window.__valley.debug.triangles,
    draws: window.__valley.debug.draws,
    quality: window.__valley.debug.quality,
    camera: window.__valley.debug.camera,
  }));

  return { ...shot, file: path.basename(file), ...debug };
}

/** The run's diagnostics, beside the images, for diffing two runs. */
export async function writeIndex(out, entries, options) {
  const index = {
    shotAt: new Date().toISOString(),
    width: options.width,
    height: options.height,
    tier: options.tier,
    dev: options.dev,
    shots: entries,
  };
  await writeFile(path.join(out, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  return index;
}

export function report(entry) {
  const { models, triangles, draws, quality, camera } = entry;
  console.log(
    `  ${entry.name.padEnd(10)} ${String(triangles).padStart(9)} tris  ` +
      `${String(draws).padStart(4)} draws  ${String(quality).padEnd(6)} ` +
      `models ${models.loaded}/${models.wanted}  ` +
      `at z=${Math.round(camera.z)} x=${Math.round(camera.x)}`,
  );
}
