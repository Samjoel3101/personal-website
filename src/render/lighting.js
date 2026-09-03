import { AmbientLight, DirectionalLight, HemisphereLight, Vector3 } from 'three';
import { SUN } from '../config/render.js';
import { SKY, GROUND } from '../config/palette.js';

/**
 * One sun, one sky bounce, one flat ambient.
 *
 * Deliberately bright and low-contrast: a physically weighted key light gives
 * near-black shadow sides, which is exactly what a cartoon racer avoids. The
 * sun tips faces a little brighter or darker than each other and the palette
 * carries the rest.
 */
export function createLighting(scene) {
  const direction = new Vector3(SUN.DIRECTION.x, SUN.DIRECTION.y, SUN.DIRECTION.z).normalize();

  const sun = new DirectionalLight(0xfff4dd, SUN.INTENSITY);
  sun.position.copy(direction).multiplyScalar(600);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SUN.SHADOW_MAP_SIZE, SUN.SHADOW_MAP_SIZE);
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.6;

  const shadowCamera = sun.shadow.camera;
  shadowCamera.left = -SUN.SHADOW_RADIUS;
  shadowCamera.right = SUN.SHADOW_RADIUS;
  shadowCamera.top = SUN.SHADOW_RADIUS;
  shadowCamera.bottom = -SUN.SHADOW_RADIUS;
  shadowCamera.near = 1;
  shadowCamera.far = 1800;
  shadowCamera.updateProjectionMatrix();

  // The kart sits at the origin, so the shadow frustum can too.
  scene.add(sun);
  scene.add(sun.target);

  const skyBounce = new HemisphereLight(SKY.MIDDLE, GROUND.LOT, SUN.AMBIENT_INTENSITY);
  scene.add(skyBounce);

  const fill = new AmbientLight(0xffffff, 0.16);
  scene.add(fill);

  return {
    sun,
    setShadowsEnabled(enabled) {
      sun.castShadow = enabled;
    },
  };
}
