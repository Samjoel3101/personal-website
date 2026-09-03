import { renderContactLinks } from './links.js';

/** A section of short one-liners reads better as chips than as another list. */
const isChipList = (section) => !section.meta && section.items.every((item) => item.length < 26);

/**
 * The landmark card.
 *
 * Content is written with textContent rather than innerHTML throughout. The
 * resume is authored by hand in this repository so nothing here is hostile,
 * but building DOM this way means it stays safe if that ever changes — a CMS,
 * a fetched profile — without anyone having to remember why.
 */
export function createCard(elements, { onClose }) {
  elements.cardClose.addEventListener('click', onClose);
  elements.card.addEventListener('click', (event) => {
    if (event.target === elements.card) onClose();
  });

  return {
    open(landmark) {
      elements.cardIcon.textContent = landmark.icon;
      elements.cardTitle.textContent = landmark.title;
      elements.cardSubtitle.textContent = landmark.subtitle ?? '';
      elements.cardBody.replaceChildren(...landmark.sections.map(renderSection));

      if (landmark.showContactLinks) {
        elements.cardLinks.hidden = false;
        renderContactLinks(elements.cardLinks);
      } else {
        elements.cardLinks.hidden = true;
      }

      elements.card.hidden = false;
      elements.cardClose.focus();
    },

    close() {
      elements.card.hidden = true;
    },

    get isOpen() {
      return !elements.card.hidden;
    },
  };
}

function renderSection(section) {
  const wrapper = document.createElement('div');
  wrapper.className = isChipList(section) ? 'section tags' : 'section';

  if (section.heading) {
    const heading = document.createElement('h3');
    heading.textContent = section.heading;
    wrapper.append(heading);
  }
  if (section.meta) {
    const meta = document.createElement('p');
    meta.className = 'meta';
    meta.textContent = section.meta;
    wrapper.append(meta);
  }

  const list = document.createElement('ul');
  list.append(
    ...section.items.map((item) => {
      const entry = document.createElement('li');
      entry.textContent = item;
      return entry;
    }),
  );
  wrapper.append(list);
  return wrapper;
}
