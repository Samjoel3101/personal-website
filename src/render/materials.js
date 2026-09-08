import { Color, MeshLambertMaterial } from 'three';

/**
 * Shared materials.
 *
 * Every material here is Lambert: no specular term, no roughness maps, no
 * physically based anything. That is a choice, not a shortcut. The look is
 * flat and saturated, and a PBR material lit brightly enough to stay saturated
 * blows out its highlights; Lambert is also roughly half the fragment cost,
 * which is what pays for a three-thousand-unit draw distance.
 *
 * ---------------------------------------------------------------------------
 * THE COLOUR TRAP. Read this before adding an instanced mesh.
 *
 * three has two ways to vary colour per object and they need different
 * material settings:
 *
 *   1. Per VERTEX — a `color` attribute baked into the geometry. Needs
 *      `vertexColors: true`. Every shape in ./geometry carries one.
 *   2. Per INSTANCE — `InstancedMesh.setColorAt`. Needs nothing: the shader
 *      defines USE_COLOR from the instance colour on its own.
 *
 * The two compose — the vertex colour is multiplied by the instance colour —
 * which is exactly what the planting relies on: a pine carries its own trunk
 * and canopy colours, and each individual tree is then shaded a little lighter
 * or darker.
 *
 * What does not work is `vertexColors: true` on a geometry with no `color`
 * attribute. The shader reads an unbound attribute as (0, 0, 0) and multiplies
 * the result to black — silently, with no warning. A whole valley of black
 * boulders is what that looks like, which is why a fetched glTF (no colour
 * attribute) gets its own material in ./model-upgrade.js.
 * ---------------------------------------------------------------------------
 */
const cache = new Map();

export function lambert(color, options = {}) {
  const key = `${color}|${JSON.stringify(options)}`;
  if (!cache.has(key)) {
    cache.set(key, new MeshLambertMaterial({ color: new Color(color), ...options }));
  }
  return cache.get(key);
}

/** For geometries carrying their own `color` attribute. */
export function vertexColoured(options = {}) {
  return lambert('#ffffff', { vertexColors: true, ...options });
}

export function disposeMaterials() {
  for (const material of cache.values()) material.dispose();
  cache.clear();
}
