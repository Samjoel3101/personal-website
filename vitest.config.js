import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The world model is pure and runs in Node. Anything needing a DOM opts in
    // per file with a `@vitest-environment jsdom` docblock.
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      /*
       * Scoped to the pure modules on purpose.
       *
       * These are the parts that run in Node with no DOM, so a unit test can
       * cover them properly and a threshold means something. The renderer, the
       * UI, audio and input are browser code — they are covered by the
       * Playwright suite, and including them here would only produce a global
       * percentage that is technically true and tells nobody anything.
       */
      include: [
        'src/core/**/*.js',
        'src/world/**/*.js',
        'src/physics/**/*.js',
        'src/content/**/*.js',
      ],
      thresholds: { statements: 85, branches: 80, functions: 85, lines: 85 },
    },
  },
});
