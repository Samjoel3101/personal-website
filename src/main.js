import { SPECIES } from './config/flora.js';
import { createSession } from './app/session.js';
import { collectElements } from './ui/dom.js';
import { createAssetLoader } from './assets/loader.js';
import { assetIds, assetInfo } from './assets/registry.js';
import './styles/main.css';

/**
 * Boot sequence, and nothing else.
 *
 * Order matters in one place: the valley is generated before the scene,
 * because the scene is built from it, and optional assets are fetched last and
 * asynchronously, because the scene must be complete whether or not they ever
 * arrive. Generating the valley is a few hundred milliseconds of noise
 * sampling on the main thread, which is what the loading card is for.
 */
async function boot() {
  const elements = collectElements();

  // A frame for the browser to paint the loading card before the main thread
  // disappears into terrain generation.
  await nextFrame();

  const session = createSession(elements);
  session.showIntro();

  loadOptionalAssets(session);

  // Handy in the console, and used by the end-to-end suite.
  window.__valley = session;
}

/**
 * Pulls in whatever third-party models are actually present.
 *
 * Every species that names an `asset` gets one attempt at replacing its
 * procedural shape with a fetched model. Failures are expected and non-fatal:
 * a fresh clone with no `npm run assets:fetch` behind it renders the whole
 * valley out of procedural geometry, which is the point of the rule.
 */
async function loadOptionalAssets(session) {
  const assets = createAssetLoader();
  const wanted = new Set(SPECIES.map((species) => species.asset).filter(Boolean));

  await Promise.all(
    assetIds
      .filter((id) => wanted.has(id) && assetInfo(id)?.role === 'flora')
      .map(async (id) => {
        const model = await assets.model(id);
        if (model) session.stage.useModel(id, model);
      }),
  );

  if (assets.failures.length > 0) {
    console.warn('Optional models unavailable, using procedural shapes:', assets.failures);
  }
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

boot().catch((error) => {
  console.error('Failed to start:', error);
  document.getElementById('loading')?.classList.add('failed');
});
