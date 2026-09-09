import { writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

/**
 * The contact sheet: every waypoint beside the reference frame it is chasing.
 *
 * This is the whole reason the tool exists. A screenshot on its own answers
 * "did it change"; a screenshot next to the reference answers "is it right",
 * and those are different questions. The checklist in docs/reference/README.md
 * is what turns the second one into something that can be argued about.
 */
export async function writeContactSheet(out, index, referenceDir) {
  const available = new Set(await readdir(referenceDir).catch(() => []));

  const rows = index.shots
    .map((shot) => {
      const hasReference = shot.reference && available.has(shot.reference);
      const reference = hasReference
        ? `<img src="${path.relative(out, path.join(referenceDir, shot.reference))}" alt="${shot.reference}" />`
        : '<div class="none">no reference for this waypoint</div>';

      return `<section>
    <h2>${shot.name} <small>${shot.note ?? ''}</small></h2>
    <div class="pair">
      <figure><img src="${shot.file}" alt="${shot.name}" /><figcaption>ours &middot; ${shot.triangles.toLocaleString()} tris &middot; ${shot.draws} draws &middot; ${shot.quality} &middot; models ${shot.models.loaded}/${shot.models.wanted} &middot; z=${Math.round(shot.camera.z)}</figcaption></figure>
      <figure>${reference}<figcaption>reference${hasReference ? ` &middot; ${shot.reference}` : ''}</figcaption></figure>
    </div>
  </section>`;
    })
    .join('\n  ');

  const html = `<!doctype html>
<meta charset="utf-8" />
<title>Valley contact sheet</title>
<style>
  body { margin: 0; padding: 24px 28px; background: #16181c; color: #e8e6e1;
         font: 13px/1.5 ui-sans-serif, system-ui, sans-serif; }
  h1 { font-size: 19px; margin: 0 0 2px; }
  p.meta { margin: 0 0 26px; color: #9a978f; }
  section { margin-bottom: 30px; }
  h2 { font-size: 15px; margin: 0 0 8px; text-transform: capitalize; }
  h2 small { font-weight: 400; color: #9a978f; text-transform: none; margin-left: 8px; }
  .pair { display: grid; gap: 14px; grid-template-columns: 1fr 1fr; }
  figure { margin: 0; background: #212429; border-radius: 8px; overflow: hidden; }
  figure img { display: block; width: 100%; height: auto; }
  figcaption { padding: 7px 10px; color: #9a978f; font-variant-numeric: tabular-nums; }
  .none { display: grid; place-items: center; aspect-ratio: 16/9; color: #6c6a65; }
  @media (max-width: 900px) { .pair { grid-template-columns: 1fr; } }
</style>
<h1>Valley contact sheet</h1>
<p class="meta">${index.shotAt} &middot; ${index.width}&times;${index.height}${index.tier ? ` &middot; tier pinned to ${index.tier}` : ''}${index.dev ? ' &middot; dev server' : ''} &middot; checklist in <code>docs/reference/README.md</code></p>
  ${rows}
`;

  const file = path.join(out, 'index.html');
  await writeFile(file, html);
  return file;
}
