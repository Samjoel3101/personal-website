import { LANDMARKS, OWNER } from './content/resume.js';
import { createCity } from './world/city.js';
import { createSession } from './game/session.js';
import { collectElements } from './ui/dom.js';
import { createAssetLoader } from './assets/loader.js';
import { assetIds, assetInfo } from './assets/registry.js';
import './styles/main.css';

/**
 * Boot sequence, and nothing else.
 *
 * Order matters here: fonts before the city, because the landmark name plates
 * bake text into textures and would otherwise be measured with fallback
 * metrics; the city before the scene, because the scene is built from it; and
 * optional assets last and asynchronously, because the game must be playable
 * whether or not they ever arrive.
 */
async function boot() {
  const elements = collectElements();
  document.title = `${OWNER.name} — drive my resume`;

  await waitForFonts();

  const city = createCity();
  const session = createSession(elements, city);
  session.showIntro();

  // Optional upgrades. Failures are expected and non-fatal by design.
  loadOptionalAssets(session);

  // Handy in the console and used by the end-to-end suite.
  window.__kart = { session, city, landmarks: LANDMARKS };
}

/**
 * Pulls in whatever third-party assets are actually present.
 *
 * Only assets whose manifest `role` the app asks for are requested, so an
 * entry can sit in the manifest as pinned reference material without costing a
 * visitor a single byte. Nothing here is awaited by the boot path: the game is
 * already playable, and an asset that never arrives simply leaves the
 * procedural version in place.
 */
async function loadOptionalAssets(session) {
  const assets = createAssetLoader();

  const kartAsset = assetIds.find((id) => assetInfo(id)?.role === 'kart');
  if (kartAsset) {
    const model = await assets.model(kartAsset);
    if (model) session.stage.useKartModel(model);
  }

  // Scenery upgrades. Requested in parallel and applied as they land; each one
  // no-ops if its model never arrives, leaving the procedural version alone.
  await Promise.all(
    assetIds
      .filter((id) => assetInfo(id)?.role === 'scenery')
      .map(async (id) => {
        const model = await assets.model(id);
        if (model) session.stage.useSceneryModel(id, model);
      }),
  );

  if (assets.failures.length > 0) {
    console.warn('Optional assets unavailable, using procedural fallbacks:', assets.failures);
  }
}

/**
 * The name plates are rasterised into textures, so they need the font to have
 * arrived. Never wait long for it: the font is a nicety, not a dependency, and
 * a blocked CDN must not hold the whole site hostage.
 */
function waitForFonts() {
  if (!document.fonts) return Promise.resolve();
  const wanted = Promise.all([
    document.fonts.load('600 26px "Fredoka"'),
    document.fonts.load('400 16px "Fredoka"'),
  ]).catch(() => {});
  return Promise.race([
    Promise.all([wanted, document.fonts.ready]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]);
}

boot().catch((error) => {
  console.error('Failed to start:', error);
  document.getElementById('loading')?.classList.add('failed');
});
