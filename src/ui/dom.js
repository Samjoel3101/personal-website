/**
 * Every element the UI touches, resolved once.
 *
 * Keeping the selectors in one place means a rename in index.html breaks
 * loudly here rather than silently somewhere deep in an event handler.
 */
export function collectElements() {
  const byId = (id) => document.getElementById(id);

  return {
    canvas: byId('scene'),
    hud: byId('hud'),
    progress: byId('progress'),
    compassArrow: byId('compass-arrow'),
    compassName: byId('compass-name'),
    compassDistance: byId('compass-distance'),
    speed: byId('speed'),
    boostBar: byId('boost-bar'),
    minimap: byId('minimap'),
    hint: byId('hint'),
    touch: byId('touch'),
    muteButton: byId('mute'),
    resumeButton: byId('open-resume'),
    loading: byId('loading'),
    intro: byId('intro'),
    introName: byId('intro-name'),
    introTagline: byId('intro-tagline'),
    startButton: byId('start'),
    skipButton: byId('skip'),
    card: byId('card'),
    cardIcon: byId('card-icon'),
    cardTitle: byId('card-title'),
    cardSubtitle: byId('card-subtitle'),
    cardBody: byId('card-body'),
    cardLinks: byId('card-links'),
    cardClose: byId('card-close'),
    complete: byId('complete'),
    completeLine: byId('complete-line'),
    completeLinks: byId('complete-links'),
    completeClose: byId('complete-close'),
    resumeView: byId('resume-view'),
    resumeInner: byId('resume-inner'),
    resumeBack: byId('resume-back'),
  };
}
