/**
 * The one place the interface looks anything up.
 *
 * Every id in index.html is named here, so a renamed element breaks in one
 * obvious place rather than as a null dereference three modules away.
 */
const IDS = {
  canvas: 'scene',
  loading: 'loading',
  loadingNote: 'loading-note',
  intro: 'intro',
  begin: 'begin',
  hud: 'hud',
  biome: 'biome-name',
  progress: 'progress-bar',
  pause: 'pause',
  hint: 'hint',
  fly: 'fly',
};

export function collectElements() {
  const elements = {};
  for (const [key, id] of Object.entries(IDS)) {
    elements[key] = document.getElementById(id);
    if (!elements[key]) throw new Error(`Missing element #${id}`);
  }
  return elements;
}
