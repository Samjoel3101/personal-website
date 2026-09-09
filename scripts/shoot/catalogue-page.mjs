/**
 * The catalogue page.
 *
 * A model on a neutral ground, framed by its own bounding box, lit the way the
 * valley lights it. Nothing here shares code with src/render on purpose: the
 * question this answers is "what is actually IN this file" — its real colours,
 * its real silhouette — and a catalogue that inherited the scene's tints and
 * its unit-height normalisation would answer "what does this project already
 * do to it" instead, which is the thing under suspicion.
 */
export const CATALOGUE_HTML = `<!doctype html>
<meta charset="utf-8" />
<style>
  html, body { margin: 0; background: #8a9aa6; }
  canvas { display: block; }
</style>
<script type="importmap">
  { "imports": { "three": "/three/build/three.module.js", "three/": "/three/" } }
</script>
<script type="module">
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

  const SIZE = Number(new URLSearchParams(location.search).get('size') ?? 320);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(SIZE, SIZE);
  renderer.setClearColor(0x8a9aa6);
  document.body.append(renderer.domElement);

  const scene = new THREE.Scene();
  // The valley's own light, so a model's value here is the value it will have
  // in the frame: a raking key with a very high ambient. Judging foliage under
  // a default three-point rig and then wondering why it looks dark in the
  // scene is a whole afternoon.
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.position.set(0.5, 0.62, -0.34).multiplyScalar(100);
  scene.add(sun, new THREE.AmbientLight(0xffffff, 1.25));

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 4000),
    new THREE.MeshLambertMaterial({ color: 0x9aa79f }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 10000);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  let current = null;

  window.__catalogue = {
    async show(file) {
      if (current) { scene.remove(current); current = null; }
      const gltf = await loader.loadAsync('/models/' + file);
      current = gltf.scene;
      scene.add(current);

      // Frame by the model's own bounds so a pebble and a pine are both
      // legible, and sit it on the ground rather than through it.
      const box = new THREE.Box3().setFromObject(current);
      const size = box.getSize(new THREE.Vector3());
      const centre = box.getCenter(new THREE.Vector3());
      current.position.y -= box.min.y;
      centre.y -= box.min.y;

      const reach = Math.max(size.x, size.y, size.z) || 1;
      const distance = (reach / 2) / Math.tan((camera.fov * Math.PI) / 360) * 1.9;
      camera.position.set(distance * 0.62, centre.y + reach * 0.35, distance * 0.78);
      camera.lookAt(centre);
      camera.near = distance / 100;
      camera.far = distance * 20;
      camera.updateProjectionMatrix();

      renderer.render(scene, camera);
      return {
        triangles: renderer.info.render.triangles,
        size: [size.x, size.y, size.z].map((n) => Math.round(n * 100) / 100),
      };
    },
  };
  window.__catalogueReady = true;
</script>
`;
