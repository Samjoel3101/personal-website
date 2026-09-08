import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, Mesh } from 'three';
import { WATER } from '../config/palette.js';
import { lambert } from './materials.js';

/**
 * The pond and the oasis.
 *
 * A flat disc each, drawn at the pool's own surface level with the terrain
 * carved to meet it — see src/world/water.js, which owns that agreement. The
 * disc is built by hand rather than with CircleGeometry for one reason: it is
 * vertex-coloured from a dark centre to a pale rim, which does the work of a
 * depth-faded shader for none of the cost and reads correctly under flat
 * lighting.
 *
 * Transparent, but with depth writing left on. These are horizontal planes
 * that nothing else intersects, so the usual sorting problems do not arise,
 * and turning it off lets the ground under the water z-fight through.
 */
const SEGMENTS = 40;

export function buildWater(pools) {
  const group = new Group();
  group.name = 'water';
  const material = lambert('#ffffff', {
    vertexColors: true,
    transparent: true,
    opacity: 0.82,
    side: DoubleSide,
  });

  for (const pool of pools) {
    const mesh = new Mesh(disc(pool.radius), material);
    mesh.position.set(pool.x, pool.level, pool.z);
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

/** A fan of triangles from a dark centre out to a pale, slightly ragged rim. */
function disc(radius) {
  const positions = [0, 0, 0];
  const colours = [];
  const deep = new Color(WATER.DEEP);
  const shallow = new Color(WATER.SHALLOW);
  colours.push(deep.r, deep.g, deep.b);

  for (let i = 0; i <= SEGMENTS; i += 1) {
    const angle = (i / SEGMENTS) * Math.PI * 2;
    // A little wobble on the rim, so the waterline is not a drawn compass
    // circle sitting in an otherwise hand-made landscape.
    const r = radius * (0.97 + 0.03 * Math.sin(angle * 5));
    positions.push(Math.cos(angle) * r, 0, Math.sin(angle) * r);
    colours.push(shallow.r, shallow.g, shallow.b);
  }

  const indices = [];
  for (let i = 1; i <= SEGMENTS; i += 1) indices.push(0, i + 1, i);

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
