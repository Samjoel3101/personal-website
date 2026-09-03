import { LANDMARKS, OWNER } from '../content/resume.js';
import { anchor } from './links.js';

/**
 * The same resume as an ordinary scrolling page.
 *
 * This is not a fallback, it is a first-class route. A recruiter with four
 * minutes should not have to learn to drive, and the heavier the game gets the
 * more this is the thing most visitors actually read.
 */
export function createResumeView(elements) {
  elements.resumeInner.replaceChildren(...renderDocument());
  elements.resumeBack.addEventListener('click', () => hide());

  const show = () => {
    elements.resumeView.hidden = false;
    elements.resumeView.scrollTop = 0;
  };
  const hide = () => {
    elements.resumeView.hidden = true;
  };

  return {
    show,
    hide,
    get isOpen() {
      return !elements.resumeView.hidden;
    },
  };
}

function renderDocument() {
  const nodes = [heading('h1', OWNER.name), paragraph(OWNER.tagline), contactLine()];

  const linkRow = document.createElement('div');
  linkRow.className = 'card-links';
  linkRow.style.justifyContent = 'flex-start';
  linkRow.append(...OWNER.links.map((link) => anchor(link.label, link.url)));
  nodes.push(linkRow);

  for (const landmark of LANDMARKS) {
    nodes.push(heading('h2', `${landmark.icon} ${landmark.title}`));
    for (const section of landmark.sections) nodes.push(...renderSection(section));
  }
  return nodes;
}

function renderSection(section) {
  const block = document.createElement('div');
  block.className = 'section';
  if (section.heading) block.append(heading('h3', section.heading));
  if (section.meta) {
    const meta = paragraph(section.meta);
    meta.className = 'meta';
    block.append(meta);
  }
  const list = document.createElement('ul');
  list.append(
    ...section.items.map((item) => {
      const entry = document.createElement('li');
      entry.textContent = item;
      return entry;
    }),
  );
  block.append(list);
  return [block];
}

function contactLine() {
  const line = paragraph(`${OWNER.location} · `);
  line.append(anchor(OWNER.email, `mailto:${OWNER.email}`));
  return line;
}

function heading(tag, text) {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

function paragraph(text) {
  const element = document.createElement('p');
  element.className = 'sub';
  element.textContent = text;
  return element;
}
