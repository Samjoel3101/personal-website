import { Color, MeshLambertMaterial } from 'three';

/**
 * Shared material cache.
 *
 * Every material here is Lambert: no specular term, no roughness maps, no
 * physically based anything. That is a deliberate choice, not a shortcut. The
 * look this project wants is flat and saturated, and a PBR material lit
 * brightly enough to stay saturated blows out its highlights. Lambert is also
 * roughly half the fragment cost, which is what pays for the draw distance.
 *
 * ---------------------------------------------------------------------------
 * THE COLOUR TRAP. Read this before adding an instanced mesh.
 *
 * three has two ways to vary colour per object, and they need opposite
 * material settings:
 *
 *   1. Per INSTANCE (InstancedMesh.setColorAt) — use `instancedTinted()`.
 *      Do NOT set vertexColors. `instancingColor` already defines USE_COLOR in
 *      the fragment shader, and the vertex shader multiplies instanceColor in
 *      on its own.
 *
 *   2. Per VERTEX (a `color` attribute baked into the geometry) — use
 *      `vertexColoured()`, which does set vertexColors.
 *
 * Setting vertexColors on a mesh whose geometry has no `color` attribute makes
 * the shader read an unbound attribute as (0,0,0) and multiply the result to
 * black — silently, with no warning. A whole stage of black boulders is what
 * that looks like.
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

/** For InstancedMesh + setColorAt. See THE COLOUR TRAP above. */
export function instancedTinted(options = {}) {
  return lambert('#ffffff', options);
}

/** For geometries carrying their own `color` attribute. */
export function vertexColoured(options = {}) {
  return lambert('#ffffff', { vertexColors: true, ...options });
}

export function disposeMaterials() {
  for (const material of cache.values()) material.dispose();
  cache.clear();
}
