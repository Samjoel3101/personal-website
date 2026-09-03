import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TextureLoader } from 'three';
import { assetUrl } from './registry.js';

/**
 * Loads optional third-party assets.
 *
 * Every method resolves to `null` rather than rejecting when an asset is
 * missing. That is the contract the whole renderer is built on: assets are an
 * upgrade, never a dependency, so a blocked CDN or a fresh clone with no
 * `assets:fetch` run still produces a complete, working city out of procedural
 * geometry. Builders check for null and choose.
 */
export function createAssetLoader() {
  const gltf = new GLTFLoader();
  const textures = new TextureLoader();
  const cache = new Map();
  const failures = [];

  function remember(id, promise) {
    if (!cache.has(id)) cache.set(id, promise);
    return cache.get(id);
  }

  function missing(id, error) {
    failures.push({ id, reason: error?.message ?? 'not found' });
    return null;
  }

  return {
    /** @returns {Promise<import('three').Group|null>} */
    model(id) {
      const url = assetUrl(id);
      if (!url) return Promise.resolve(missing(id, new Error('not in manifest')));
      return remember(
        id,
        gltf
          .loadAsync(url)
          .then((result) => result.scene)
          .catch((error) => missing(id, error)),
      );
    },

    /** @returns {Promise<import('three').Texture|null>} */
    texture(id) {
      const url = assetUrl(id);
      if (!url) return Promise.resolve(missing(id, new Error('not in manifest')));
      return remember(
        id,
        textures.loadAsync(url).catch((error) => missing(id, error)),
      );
    },

    /** Assets that were asked for and could not be loaded. Useful in the
     *  console and asserted on by the end-to-end tests. */
    get failures() {
      return [...failures];
    },
  };
}
