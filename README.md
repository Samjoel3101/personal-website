# Drive my résumé

An interactive résumé you drive through: a WebGL kart racer around a
procedurally generated city, where each of six landmarks opens a card with part
of my background.

There is also a **Text version** button. A recruiter with four minutes should
not have to learn to drive.

```bash
npm install
npm run dev
```

## What it is made of

|                      |                                                          |
| -------------------- | -------------------------------------------------------- |
| Rendering            | three.js (WebGL2) — instanced meshes, shadow maps, bloom |
| Build                | Vite                                                     |
| Tests                | Vitest (unit) + Playwright (browser)                     |
| Quality              | ESLint, Prettier, size and complexity limits             |
| Runtime dependencies | one: `three`                                             |

The city, the kart, the trees, the sky, the road markings and every sound are
generated in code. Third-party assets are optional upgrades declared in
`assets/manifest.json`; the site is complete without any of them.

## Making it yours

Edit **`src/content/resume.js`**. That is the only file with anything personal
in it — the landmark cards, the compass, the minimap and the plain-text résumé
all read from it. Landmark coordinates must sit on a block centre; a unit test
enforces it.

## Documentation

| File                                           | For                                            |
| ---------------------------------------------- | ---------------------------------------------- |
| [`CLAUDE.md`](CLAUDE.md)                       | **Start here.** Commands, rules, and the traps |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How it fits together and why                   |
| [`docs/ROADMAP.md`](docs/ROADMAP.md)           | What to build next, specified                  |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)           | Conventions                                    |
| [`CREDITS.md`](CREDITS.md)                     | Attribution, generated from the manifest       |

## Commands

| Command                            |                                                           |
| ---------------------------------- | --------------------------------------------------------- |
| `npm run dev`                      | Dev server                                                |
| `npm run check`                    | Lint, format, assets, tests, build — run before finishing |
| `npm test`                         | Unit tests                                                |
| `npm run e2e`                      | Browser tests                                             |
| `npm run assets:fetch -- --record` | Download and pin third-party assets                       |

## Deploying

Static output. `npm run build`, then serve `dist/`. For GitHub Pages, point
Pages at the branch and directory; `base` is already relative so it works from
a repository subpath.

## Controls

`W`/`↑` accelerate · `S`/`↓` brake and reverse · `A`/`D` steer · `Shift` drift ·
`M` mute · `Esc` close a card. Touch controls appear automatically on a phone.

## Notes

- The city is a torus — drive off one edge and arrive at the other, so there
  are no invisible walls and no way to get lost.
- The layout is seeded, so it is identical on every visit and in every test.
- Physics runs at a fixed 120 Hz regardless of display refresh rate.
- Quality adapts to the machine: three tiers, chosen from measured frame
  intervals.
