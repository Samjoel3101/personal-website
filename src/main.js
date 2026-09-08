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
 * Each species lists its models best first — a Quaternius pack model a human
 * installed, then the Kenney one that can be fetched anywhere — and takes the
 * first that loads. Everything after it is dropped rather than requested, so a
 * fully installed pack costs no wasted downloads and a bare clone costs none
 * at all.
 *
 * Failures are expected and non-fatal by design: with nothing on disk the
 * whole valley draws from procedural geometry, which is the rule this project
 * is built on.
 */
async function loadOptionalAssets(session) {
  const assets = createAssetLoader();

  await Promise.all(
    SPECIES.filter((species) => species.assets?.length).map(async (species) => {
      for (const id of species.assets) {
        if (!assetIds.includes(id) || assetInfo(id)?.role !== 'flora') continue;
        const model = await assets.model(id);
        if (model && session.stage.useModel(id, model)) return;
      }
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
