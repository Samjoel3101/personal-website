import { AmbientLight, DirectionalLight, HemisphereLight, Vector3 } from 'three';
import { SUN } from '../config/render.js';
import { SKY, TERRAIN } from '../config/palette.js';

/**
 * One sun, one sky bounce, one flat ambient.
 *
 * Still deliberately soft — a physically weighted key light gives near-black
 * shadow sides, which is exactly what a cartoon racer avoids — but less soft
 * than the pastel city wanted. Earth and moss can take shadow that a lilac
 * facade could not, and a heightfield is invisible without it, so the key is
 * warmer, lower and a touch stronger while the fill has come down.
 *
 * The bounce's ground colour is mud, not concrete: everything under this sky
 * is dirt, and a grey bounce puts a cold rim on the underside of every rock.
 */
export function createLighting(scene) {
  const direction = new Vector3(SUN.DIRECTION.x, SUN.DIRECTION.y, SUN.DIRECTION.z).normalize();

  const sun = new DirectionalLight(0xffeecf, SUN.INTENSITY);
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

  const skyBounce = new HemisphereLight(SKY.MIDDLE, TERRAIN.MUD, SUN.AMBIENT_INTENSITY);
  scene.add(skyBounce);

  const fill = new AmbientLight(0xfff2e0, 0.13);
  scene.add(fill);

  return {
    sun,
    setShadowsEnabled(enabled) {
      sun.castShadow = enabled;
    },
  };
}
