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
 * A species' `assets` is an ordered list of *choices*, best first, and the
 * first choice that yields anything wins — a Quaternius pack model, then the
 * Kenney one that can be fetched anywhere. Everything after it is dropped
 * rather than requested, so a fully installed pack costs no wasted downloads
 * and a bare clone costs none at all.
 *
 * A choice may itself be a list, and that means something different: those are
 * *variants of the same thing*, all of them used, one picked per plant by
 * where it stands. One pine model for every pine is most of why a forest reads
 * as synthetic, and this is the fix. A variant that fails to download simply
 * leaves fewer forms in the mix.
 *
 * Failures are expected and non-fatal by design: with nothing on disk the
 * whole valley draws from procedural geometry, which is the rule this project
 * is built on.
 */
async function loadOptionalAssets(session) {
  const assets = createAssetLoader();
  const wanted = SPECIES.filter((species) => species.assets?.length);
  let loaded = 0;

  await Promise.all(
    wanted.map(async (species) => {
      for (const choice of species.assets) {
        const ids = (Array.isArray(choice) ? choice : [choice]).filter(
          (id) => assetIds.includes(id) && assetInfo(id)?.role === 'flora',
        );
        if (ids.length === 0) continue;

        const models = (await Promise.all(ids.map((id) => assets.model(id)))).filter(Boolean);
        if (models.length > 0 && session.stage.useModels(species.id, models)) {
          loaded += 1;
          return;
        }
      }
    }),
  );

  session.debug.models = { loaded, wanted: wanted.length };

  /*
   * Say something when nothing arrived.
   *
   * Nothing binary is committed, so a fresh clone has an empty public/assets
   * and every species falls back to its procedural shape. That is the design
   * working — but it is also exactly what a broken model pipeline looks like,
   * and the difference has to be one line in the console rather than a guess.
   */
  if (loaded === 0) {
    console.warn(
      `No models on disk: all ${wanted.length} species are drawing their procedural shapes. ` +
        'Run `npm run assets:fetch` to download them (it also runs before `npm run dev`).',
    );
  } else if (assets.failures.length > 0) {
    console.warn(
      `${loaded}/${wanted.length} species upgraded; the rest are procedural:`,
      assets.failures,
    );
  }
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

boot().catch((error) => {
  console.error('Failed to start:', error);
  document.getElementById('loading')?.classList.add('failed');
});
