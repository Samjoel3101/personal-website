import { AmbientLight, DirectionalLight, HemisphereLight, Vector3 } from 'three';
import { SUN } from '../config/render.js';
import { GROUND, SKY } from '../config/palette.js';

/**
 * One sun, one sky bounce, one flat ambient.
 *
 * Deliberately soft. A physically weighted key light gives near-black shadow
 * sides, which is exactly what an illustrated landscape avoids — but not so
 * soft that the relief disappears, because a heightfield lit flat is a
 * coloured sheet of paper. The sun is low and off to one side for the same
 * reason: raking light is what gives a hillside its shape.
 *
 * The shadow frustum is a few hundred units across and follows the camera.
 * Stretching it over the whole valley would spend the same 2048 pixels on
 * fifty times the area and give every tree a shadow made of stairs.
 */
export function createLighting(scene) {
  const direction = new Vector3(SUN.DIRECTION.x, SUN.DIRECTION.y, SUN.DIRECTION.z).normalize();

  const sun = new DirectionalLight(0xfff0d6, SUN.INTENSITY);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SUN.SHADOW_MAP_SIZE, SUN.SHADOW_MAP_SIZE);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.8;

  const camera = sun.shadow.camera;
  camera.left = -SUN.SHADOW_RADIUS;
  camera.right = SUN.SHADOW_RADIUS;
  camera.top = SUN.SHADOW_RADIUS;
  camera.bottom = -SUN.SHADOW_RADIUS;
  camera.near = 1;
  camera.far = 2600;
  camera.updateProjectionMatrix();

  scene.add(sun, sun.target);

  // The bounce's ground colour is soil rather than grey: everything under this
  // sky is earth, and a grey bounce puts a cold rim under every rock.
  scene.add(new HemisphereLight(SKY.MIDDLE, GROUND.woodland.bare, SUN.AMBIENT_INTENSITY));
  scene.add(new AmbientLight(0xfff4e2, 0.22));

  return {
    sun,

    /** Drags the shadow frustum along with the viewer. */
    follow(target) {
      sun.target.position.copy(target);
      sun.target.updateMatrixWorld();
      sun.position.copy(target).addScaledVector(direction, 900);
    },

    setShadowsEnabled(enabled) {
      sun.castShadow = enabled;
    },
  };
}
