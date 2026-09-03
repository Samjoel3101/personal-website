import { expect, test } from '@playwright/test';

/**
 * End-to-end coverage for the things unit tests cannot reach: that WebGL
 * actually initialises, that the scene draws, and that the whole loop from
 * pressing a key to reading a card holds together.
 */

/** Collects console errors and page exceptions for the whole test. */
function watchForErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    // The font CDN is blocked in some sandboxes; the site is built to cope.
    if (message.text().includes('fonts.googleapis')) return;
    if (message.text().includes('Failed to load resource')) return;
    errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function startDriving(page) {
  await page.goto('/');
  await expect(page.locator('#intro')).toBeVisible({ timeout: 60_000 });
  await page.click('#start');
  await expect(page.locator('#hud')).toBeVisible();
}

test('boots into the intro and starts the engine', async ({ page }) => {
  const errors = watchForErrors(page);
  await startDriving(page);

  const diagnostics = await page.evaluate(() => window.__kart.session.stage.diagnostics);
  expect(diagnostics.quality).toBeTruthy();
  // A scene that renders nothing would report zero draw calls.
  expect(diagnostics.draws).toBeGreaterThan(5);

  expect(errors).toEqual([]);
});

test('drives, and the world reacts', async ({ page }) => {
  await startDriving(page);

  const before = await page.evaluate(() => ({ ...window.__kart.session.debug.kart.state }));

  // Wait for a distance to be covered rather than for a wall-clock interval.
  // On a machine with no GPU the renderer runs at a few frames a second, and
  // the loop caps how much simulation one frame may absorb — so a fixed wait
  // measures the CI runner's graphics stack, not the kart.
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => window.__kart.session.debug.kart.state.distance > 120, null, {
    timeout: 60_000,
  });
  await page.keyboard.up('ArrowUp');

  const after = await page.evaluate(() => ({ ...window.__kart.session.debug.kart.state }));
  expect(after.z).not.toBe(before.z);
  expect(after.speed).toBeGreaterThan(0);
  expect(Number(await page.locator('#speed').textContent())).toBeGreaterThan(0);
});

test('opens a card for every landmark and finishes the tour', async ({ page }) => {
  await startDriving(page);

  const ids = await page.evaluate(() => window.__kart.landmarks.map((l) => l.id));
  expect(ids.length).toBeGreaterThan(0);

  for (const id of ids) {
    // Park just outside the ring, then step inside, so the entry latch fires.
    await page.evaluate((landmarkId) => {
      const { landmarks, session } = window.__kart;
      const landmark = landmarks.find((l) => l.id === landmarkId);
      Object.assign(session.debug.kart.state, {
        x: landmark.x,
        z: landmark.z + 400,
        speed: 0,
      });
    }, id);
    await page.waitForTimeout(120);

    await page.evaluate((landmarkId) => {
      const { landmarks, session } = window.__kart;
      const landmark = landmarks.find((l) => l.id === landmarkId);
      Object.assign(session.debug.kart.state, { x: landmark.x, z: landmark.z });
    }, id);

    await expect(page.locator('#card')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#card-title')).not.toBeEmpty();
    await page.keyboard.press('Escape');
  }

  await expect(page.locator('#complete')).toBeVisible();
  await expect(page.locator('#progress')).toHaveText(`Found ${ids.length}/${ids.length}`);
});

test('offers the résumé as a plain page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#intro')).toBeVisible({ timeout: 60_000 });
  await page.click('#skip');

  const view = page.locator('#resume-view');
  await expect(view).toBeVisible();
  await expect(view).toContainText('Work Experience');
  await expect(view).toContainText('Off the Clock');

  await page.click('#resume-back');
  await expect(view).toBeHidden();
});

test('survives a resize without errors', async ({ page }) => {
  const errors = watchForErrors(page);
  await startDriving(page);

  for (const size of [
    { width: 640, height: 900 },
    { width: 1600, height: 800 },
    { width: 900, height: 500 },
  ]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(300);
  }

  const canvas = await page.evaluate(() => {
    const element = document.getElementById('scene');
    return { width: element.width, height: element.height };
  });
  expect(canvas.width).toBeGreaterThan(0);
  expect(canvas.height).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
