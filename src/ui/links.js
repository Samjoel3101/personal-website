import { OWNER } from '../content/resume.js';

/** Builds the contact buttons shared by the landmark card and the finale. */
export function renderContactLinks(container) {
  container.replaceChildren(
    anchor('Email me', `mailto:${OWNER.email}`),
    ...OWNER.links.map((link) => anchor(link.label, link.url)),
  );
}

export function anchor(text, href) {
  const element = document.createElement('a');
  element.textContent = text;
  element.href = href;
  if (!href.startsWith('mailto:')) {
    element.target = '_blank';
    element.rel = 'noopener';
  }
  return element;
}
