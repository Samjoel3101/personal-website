import { MeshLambertMaterial } from 'three';
import { FACADE_CELL, createFacadeTexture } from './textures/facade.js';

/**
 * Facade material for instanced buildings.
 *
 * The problem it solves: an InstancedMesh shares one geometry, so every
 * building has the same UVs. Scaling a shared box to different sizes therefore
 * stretches its window texture, and a thirty-storey tower ends up with windows
 * four times the size of the shop next door.
 *
 * The fix is to derive the UV scale in the vertex shader from the instance
 * matrix itself — the length of each of its basis vectors is that instance's
 * scale — so every building gets windows of the same real-world size no matter
 * how it was stretched. The horizontal faces are masked out, because a roof
 * with windows in it looks like a mistake.
 *
 * This reaches into three.js's shader chunks, so it is coupled to their names.
 * If a three upgrade turns the buildings flat-coloured, look here first.
 */
export function createFacadeMaterial(baseOptions = {}) {
  // No vertexColors here: these meshes tint per instance, and setting it
  // would make the shader read a missing attribute as black. See the note
  // at the top of ./materials.js.
  const material = new MeshLambertMaterial(baseOptions);
  const windows = createFacadeTexture();

  material.onBeforeCompile = (shader) => {
    shader.uniforms.facadeMap = { value: windows };
    shader.uniforms.facadeCell = { value: FACADE_CELL };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec2 vFacadeUv;
         varying float vFacadeMask;
         uniform float facadeCell;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         #ifdef USE_INSTANCING
           vec3 instanceScale = vec3(
             length(instanceMatrix[0].xyz),
             length(instanceMatrix[1].xyz),
             length(instanceMatrix[2].xyz));
         #else
           vec3 instanceScale = vec3(1.0);
         #endif
         vec3 faceNormal = abs(normal);
         vec2 faceSize =
           faceNormal.y > 0.5 ? instanceScale.xz :
           faceNormal.x > 0.5 ? instanceScale.zy : instanceScale.xy;
         vFacadeUv = uv * faceSize / facadeCell;
         vFacadeMask = faceNormal.y > 0.5 ? 0.0 : 1.0;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec2 vFacadeUv;
         varying float vFacadeMask;
         uniform sampler2D facadeMap;`,
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `vec4 diffuseColor = vec4( diffuse, opacity );
         vec4 facade = texture2D(facadeMap, vFacadeUv);
         diffuseColor.rgb = mix(diffuseColor.rgb, facade.rgb, facade.a * vFacadeMask);`,
      );
  };

  // Two materials differing only in onBeforeCompile still share a program
  // unless they are told apart, so give this one its own cache key.
  material.customProgramCacheKey = () => 'facade-v1';
  return material;
}
