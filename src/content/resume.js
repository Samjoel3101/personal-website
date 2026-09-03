/**
 * THE ONLY FILE WITH ANYTHING PERSONAL IN IT.
 *
 * Replace the placeholder text below and the whole site follows: the landmark
 * cards, the compass, the minimap and the plain-text resume all read from
 * here. Nothing else in the codebase contains biography.
 *
 * Landmark coordinates must sit on a block centre — see BLOCK_CENTRES in
 * src/config/world.js — or the building lands in the middle of a road. The
 * schema in ./schema.js enforces this, and a unit test runs it.
 */
export const OWNER = {
  name: 'YOUR NAME',
  tagline: 'Software Engineer · Placeholder Tagline',
  location: 'Your City, Country',
  email: 'you@example.com',
  links: [
    { label: 'GitHub', url: 'https://github.com/yourhandle' },
    { label: 'LinkedIn', url: 'https://linkedin.com/in/yourhandle' },
    { label: 'Website', url: 'https://example.com' },
  ],
};

/** The six stops on the tour, in no particular order. */
export const LANDMARKS = [
  {
    id: 'work',
    title: 'Work Experience',
    subtitle: 'The office tower',
    icon: '🏢',
    color: '#4d86dd',
    accent: '#b6dcff',
    x: 256,
    z: 256,
    structure: { w: 150, d: 150, h: 340, style: 'tower' },
    sections: [
      {
        heading: 'Senior Placeholder Engineer · Acme Corp',
        meta: '2023 — Present · Remote',
        items: [
          'Replace this with a result you owned, ideally with a number attached.',
          'Second bullet: the system you built and what it unblocked.',
          'Third bullet: scope — team size, traffic, data volume, whatever fits.',
        ],
      },
      {
        heading: 'Placeholder Engineer · Globex',
        meta: '2021 — 2023 · Your City',
        items: [
          'A shipped project and its measurable outcome.',
          'A piece of infrastructure or tooling you introduced.',
        ],
      },
    ],
  },
  {
    id: 'education',
    title: 'Education',
    subtitle: 'The university',
    icon: '🎓',
    color: '#d9944f',
    accent: '#ffe3ae',
    x: 1280,
    z: 256,
    structure: { w: 220, d: 140, h: 180, style: 'campus' },
    sections: [
      {
        heading: 'B.Tech / B.Sc. in Placeholder Studies',
        meta: 'Placeholder University · 2017 — 2021',
        items: [
          'GPA or class rank, if it flatters you.',
          'A thesis, capstone, or research topic in one line.',
          'A scholarship, award, or society worth naming.',
        ],
      },
    ],
  },
  {
    id: 'projects',
    title: 'Projects',
    subtitle: 'The workshop',
    icon: '🛠️',
    color: '#48b46c',
    accent: '#bdffd4',
    x: 256,
    z: 1280,
    structure: { w: 190, d: 190, h: 130, style: 'workshop' },
    sections: [
      {
        heading: 'Placeholder Project One',
        meta: 'TypeScript · WebGL · 1.2k stars',
        items: [
          'What it does, in a sentence a stranger would understand.',
          'The hard part, and how you got around it.',
        ],
      },
      {
        heading: 'Placeholder Project Two',
        meta: 'Python · Postgres',
        items: [
          'What it does and who actually uses it.',
          'Link it from the Contact stop if it deserves clicks.',
        ],
      },
    ],
  },
  {
    id: 'skills',
    title: 'Skills',
    subtitle: 'The stadium',
    icon: '⚡',
    color: '#bb63ad',
    accent: '#ffc4f2',
    x: 1280,
    z: 1280,
    structure: { w: 260, d: 260, h: 62, style: 'stadium' },
    sections: [
      {
        heading: 'Languages',
        items: ['TypeScript', 'Python', 'Go', 'SQL', 'Rust (learning)'],
      },
      {
        heading: 'Platforms & Tools',
        items: ['AWS', 'Docker', 'Postgres', 'Redis', 'Terraform', 'CI/CD'],
      },
      {
        heading: 'Also comfortable with',
        items: ['System design', 'Mentoring', 'Technical writing'],
      },
    ],
  },
  {
    id: 'life',
    title: 'Off the Clock',
    subtitle: 'The corner café',
    icon: '☕',
    color: '#ef9440',
    accent: '#ffdcae',
    x: 768,
    z: 768,
    structure: { w: 160, d: 160, h: 90, style: 'cafe' },
    sections: [
      {
        heading: 'Things I do when I am not shipping',
        items: [
          'A hobby you would genuinely talk about for ten minutes.',
          'Somewhere you have travelled, or want to.',
          'A book, album, or game you push on people.',
          'A slightly odd fact — this is the bullet people remember.',
        ],
      },
    ],
  },
  {
    id: 'contact',
    title: 'Get In Touch',
    subtitle: 'The post office',
    icon: '✉️',
    color: '#3aa8bf',
    accent: '#b6f4ff',
    x: 1792,
    z: 1792,
    structure: { w: 170, d: 130, h: 120, style: 'post' },
    sections: [
      {
        heading: 'Reach me',
        items: ['Use the buttons below — they read from SITE.owner.'],
      },
    ],
    showContactLinks: true,
  },
];
