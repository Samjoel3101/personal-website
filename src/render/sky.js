import {
  AdditiveBlending,
  BackSide,
  Color,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import { SKY } from '../config/palette.js';
import { SUN } from '../config/render.js';
import { createCloudTexture } from './textures/clouds.js';

const RADIUS = 4000;

/**
 * Sky dome, cloud shell and sun.
 *
 * The dome is a three-stop vertical gradient in a shader rather than a texture:
 * it costs one tiny program, never bands, and the horizon colour can be matched
 * exactly to the scene fog so the far city dissolves instead of ending at a
 * visible line.
 *
 * All of it renders behind everything else and is exempt from fog, so it must
 * sit outside the camera's far plane logic — hence `depthWrite: false` and a
 * low render order.
 */
export function createSky() {
  const material = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new Color(SKY.TOP) },
      middleColor: { value: new Color(SKY.MIDDLE) },
      horizonColor: { value: new Color(SKY.HORIZON) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPosition;
      void main() {
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 middleColor;
      uniform vec3 horizonColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = clamp(normalize(vWorldPosition).y, 0.0, 1.0);
        // The haze band reaches higher than the city's did. A low sun puts a
        // lot of dust in the air, and it is what lets distant hills dissolve
        // into the fog instead of stacking up as silhouettes.
        vec3 lower = mix(horizonColor, middleColor, smoothstep(0.0, 0.42, h));
        vec3 color = mix(lower, topColor, smoothstep(0.30, 0.88, h));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });

  const dome = new Mesh(new SphereGeometry(RADIUS, 32, 20), material);
  dome.renderOrder = -2;
  dome.frustumCulled = false;

  dome.add(createClouds());
  dome.add(createSun());
  return dome;
}

function createClouds() {
  const shell = new Mesh(
    new SphereGeometry(RADIUS * 0.9, 40, 24),
    new ShaderMaterial({
      side: BackSide,
      transparent: true,
      depthWrite: false,
      fog: false,
      uniforms: { map: { value: createCloudTexture() } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        void main() {
          vec4 cloud = texture2D(map, vUv);
          // Fade the deck out toward the horizon, where a cloud drawn on a
          // sphere would smear into an unconvincing band.
          float h = normalize(vWorldPosition).y;
          // A heavier, lower deck than the city had: the fade starts closer to
          // the horizon so cloud hangs over the hills rather than sitting in a
          // clear ring above them.
          float fade = smoothstep(-0.02, 0.18, h);
          gl_FragColor = vec4(cloud.rgb, cloud.a * fade * 1.15);
        }
      `,
    }),
  );
  shell.renderOrder = -1;
  shell.frustumCulled = false;
  return shell;
}

function createSun() {
  const direction = new Vector3(SUN.DIRECTION.x, SUN.DIRECTION.y, SUN.DIRECTION.z).normalize();
  const sprite = new Sprite(
    new SpriteMaterial({
      color: 0xffe6b0,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false,
      transparent: true,
      opacity: 0.9,
    }),
  );
  sprite.position.copy(direction).multiplyScalar(RADIUS * 0.9);
  sprite.scale.setScalar(RADIUS * 0.11);
  sprite.renderOrder = -1;
  return sprite;
}
