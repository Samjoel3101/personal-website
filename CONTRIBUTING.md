# Contributing

## Before you finish

```bash
npm run check
```

That runs lint, format check, asset verification, unit tests and a production
build. CI runs the same thing plus the browser suite. If `check` is green and
you touched anything visual, run `npm run e2e` too.

## Conventions

**Modules.** ES modules, named exports only. No default exports — they make a
symbol harder to grep for and let two files disagree about what something is
called.

**Factories over classes.** `createThing(deps)` returning an object of
functions. Dependencies come in as arguments, never as imported singletons, so
a test can substitute them.

**Size limits are a design rule, not a style rule.** 260 lines per file, 90 per
function, complexity 16, nesting depth 4. Hitting one means the unit has taken
on a second responsibility. Split it. The limits are in `eslint.config.js` and
have caught real problems every time they have fired.

**Configuration holds no logic.** `src/config/` is numbers and colours. If you
find yourself writing an `if` there, it belongs somewhere else.

**Comments explain why.** The code already says what it does. Comment the
non-obvious decision, the constraint that forced it, and the approach that
looked right and was not. Do not comment the obvious.

## Naming

- `create*` — a factory returning an object
- `build*` — assembles geometry or a scene graph and returns it
- `*At(x, z)` — samples something at a world position
- `wrap*` — anything that respects the torus

## Adding things

**A new landmark.** Edit `src/content/resume.js`. Coordinates must be a block
centre — the schema test enforces it. The city, minimap, compass and plain
résumé all follow automatically.

**A new kind of object in the world.** Generate it as data in `src/world/`,
then add a builder in `src/render/builders/` that draws it. Do not generate
geometry in the world model, and do not invent world data inside a builder.
`npm run check:boundaries` fails the build if `src/world`, `src/physics`,
`src/content` or `src/core` end up importing `three` or anything from a
rendering/DOM-facing directory — that boundary is not just a convention.

**A third-party asset.** Add it to `assets/manifest.json` with its licence,
author, source and role, then `npm run assets:fetch -- --record`. Never commit
binaries or drop files into `public/assets` by hand. Whatever you add must have
a procedural fallback in the builder that consumes it.

**A new input device.** Write into the shared snapshot from
`src/input/input-state.js`. Do not let the physics learn what device it is.

## Testing

Put a test in `tests/` if the logic runs without a DOM. Put it in `e2e/` only
if it genuinely needs a browser — those tests take twenty seconds each.

Worth testing: anything with a boundary condition (the world seam, a surface
edge, a collision face), anything seeded, and any invariant whose breakage
would be invisible from the starting position.

Two traps that have already produced wrong tests here:

- Boost pads sit at every block midpoint, 512 apart. A kart at full speed
  covers that in two seconds, so any test that drives in a straight line for
  longer will cross one and gain speed it was expected to lose.
- `blockCentre(n)` on a road _is_ a boost pad. Offset from it when you want
  plain asphalt.

## Commits

Explain why the change was needed and what it changes about behaviour. If you
worked around something surprising, say what it was — the next person will hit
it too.
