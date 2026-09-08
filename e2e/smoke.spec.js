import { expect, test } from '@playwright/test';

/**
 * The things a unit test cannot reach: that WebGL initialises, that the scene
 * draws something, and that the flight down the valley actually advances.
 */
function watchForErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    // The font CDN is blocked in some sandboxes; the page is built to cope.
    if (message.text().includes('fonts.googleapis')) return;
    if (message.text().includes('Failed to load resource')) return;
    errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function beginFlight(page) {
  await page.goto('/');
  await expect(page.locator('#intro')).toBeVisible({ timeout: 90_000 });
  await page.click('#begin');
  await expect(page.locator('#hud')).toBeVisible();
}

test('boots, and draws a valley', async ({ page }) => {
  const errors = watchForErrors(page);
  await beginFlight(page);

  const debug = await page.evaluate(() => window.__valley.debug);
  expect(debug.running).toBe(true);
  expect(debug.quality).toBeTruthy();
  // A scene drawing nothing would report no draw calls and no triangles.
  expect(debug.draws).toBeGreaterThan(5);
  expect(debug.triangles).toBeGreaterThan(10_000);

  expect(errors).toEqual([]);
});

test('flies down the valley on its own', async ({ page }) => {
  await beginFlight(page);
  const start = await page.evaluate(() => window.__valley.debug.camera.z);

  // A short distance, waited for rather than timed. The drift is 34 units a
  // second of *simulated* time, and on a runner with no GPU rendering a frame
  // takes most of a second — so this covers a few units a second in practice,
  // and asking for a hundred metres here would be measuring the graphics
  // stack rather than the flight.
  await page.waitForFunction((from) => window.__valley.debug.camera.z > from + 40, start, {
    timeout: 150_000,
  });

  expect(await page.evaluate(() => window.__valley.debug.progress)).toBeGreaterThan(0);
});

test('the throttle moves the camera faster than the drift', async ({ page }) => {
  await beginFlight(page);
  const drifted = await page.evaluate(async () => {
    const before = window.__valley.debug.camera.z;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return window.__valley.debug.camera.z - before;
  });

  await page.keyboard.down('ArrowUp');
  const driven = await page.evaluate(async () => {
    const before = window.__valley.debug.camera.z;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return window.__valley.debug.camera.z - before;
  });
  await page.keyboard.up('ArrowUp');

  expect(driven).toBeGreaterThan(drifted);
});

test('reports where it is, and says so on screen', async ({ page }) => {
  await beginFlight(page);
  await expect(page.locator('#biome-name')).toHaveText(/Pine forest/);

  // Jump most of the way down the valley and the readout should follow.
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => window.__valley.debug.progress > 0.2, null, {
    timeout: 120_000,
  });
  await page.keyboard.up('ArrowUp');
  await expect(page.locator('#progress-bar')).not.toHaveCSS('width', '0px');
});
