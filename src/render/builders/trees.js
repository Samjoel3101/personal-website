import { CylinderGeometry, Group, IcosahedronGeometry } from 'three';
import { mergeParts } from '../geometry/merge.js';
import { FOLIAGE } from '../../config/palette.js';
import { createRng } from '../../core/rng.js';
import { paintGeometry } from '../geometry/paint.js';
import { seatOnGround } from '../ground-follow.js';
import { instancedModel } from '../model-instances.js';
import { tiledInstances } from '../geometry/tiling.js';
import { vertexColoured } from '../materials.js';

/** Every tree is authored at this height and scaled per instance. */
const REFERENCE_HEIGHT = 50;
const VARIANTS = 3;

/**
 * Low-poly trees, mostly conifers.
 *
 * Faceted icosahedrons rather than smooth spheres: the flat shading catches
 * the sun differently on each face, which gives a tree volume without a
 * texture, a normal map, or a single byte of downloaded art.
 *
 * Two of the three variants are conifers, because a backcountry stage that is
 * two-thirds round broadleaf trees reads as a park.
 *
 * The trees that make up a copse are kept in their own sub-group. That is what
 * lets a downloaded forest patch replace them without touching the lone trees
 * standing in a meadow, which a 10-unit patch of woodland would look absurd as.
 *
 * @returns {{group: Group, useModel: (id: string, model: object|null) => boolean}}
 */
export function buildTrees(city) {
  const group = new Group();
  group.name = 'trees';

  const trees = city.props.filter((prop) => prop.type === 'tree');
  const copses = city.props.filter((prop) => prop.type === 'copse');

  const standing = new Group();
  standing.name = 'copse-trees';
  addVariants(
    standing,
    trees.filter((tree) => tree.copse),
  );
  addVariants(
    group,
    trees.filter((tree) => !tree.copse),
  );
  group.add(standing);

  return {
    group,

    /** Swap the procedural copses for a downloaded forest patch. */
    useModel(id, model) {
      if (id !== 'kit.rally.forest' || copses.length === 0) return false;

      const rng = createRng(51);
      const meshes = instancedModel(
        model,
        copses.map((copse) => ({
          x: copse.x,
          y: seatOnGround(copse.x, copse.z),
          z: copse.z,
          size: copse.radius * 2,
          rotationY: rng() * Math.PI * 2,
        })),
      );
      if (meshes.length === 0) return false;

      standing.visible = false;
      for (const mesh of meshes) group.add(mesh);
      return true;
    },
  };
}

/** Splits a list of trees across the variants so a stand is not a row of
 *  identical lollipops, and adds one instanced mesh per variant. */
function addVariants(target, trees) {
  if (trees.length === 0) return;

  for (let variant = 0; variant < VARIANTS; variant += 1) {
    const items = trees
      .filter((_, index) => index % VARIANTS === variant)
      .map((tree) => {
        const scale = tree.height / REFERENCE_HEIGHT;
        return {
          x: tree.x,
          y: seatOnGround(tree.x, tree.z),
          z: tree.z,
          sx: scale,
          sy: scale,
          sz: scale,
        };
      });
    if (items.length === 0) continue;

    const mesh = tiledInstances(treeGeometry(variant), vertexColoured(), items);
    mesh.receiveShadow = false; // foliage self-shadowing reads as dirt, not depth
    target.add(mesh);
  }
}

function treeGeometry(variant) {
  const rng = createRng(1000 + variant);
  const parts = [];

  const trunkHeight = REFERENCE_HEIGHT * 0.42;
  const trunk = new CylinderGeometry(1.6, 2.3, trunkHeight, 6);
  trunk.translate(0, trunkHeight / 2, 0);
  parts.push(paintGeometry(trunk, FOLIAGE.TRUNK));

  const isConifer = variant !== 1;
  const blobs = isConifer ? 4 : 3;

  for (let i = 0; i < blobs; i += 1) {
    const t = i / Math.max(1, blobs - 1);
    const radius = isConifer
      ? REFERENCE_HEIGHT * (0.2 - t * 0.11)
      : REFERENCE_HEIGHT * (0.24 - t * 0.07);
    const height = trunkHeight + REFERENCE_HEIGHT * (isConifer ? 0.12 + t * 0.36 : 0.16 + t * 0.2);

    const blob = new IcosahedronGeometry(radius, 0);
    blob.translate((rng() - 0.5) * radius * 0.35, height, (rng() - 0.5) * radius * 0.35);
    // Darkest at the bottom, brightest at the crown, matching the sun.
    const tone = t < 0.34 ? FOLIAGE.DARK : t < 0.7 ? FOLIAGE.MID : FOLIAGE.LIGHT;
    parts.push(paintGeometry(blob, tone));
  }

  return mergeParts(parts, `tree-${variant}`);
}
