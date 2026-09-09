import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

/**
 * Lint rules exist here to protect two properties this codebase is built on:
 * every file owns one concern, and the world model never learns about the
 * renderer. The size limits are the enforcement mechanism for the first —
 * a file that outgrows them is a file that has taken on a second job.
 */
export default [
  {
    ignores: [
      'dist/**',
      // Local screenshot harnesses, gitignored; they are throwaway Node
      // scripts and not part of the project's source.
      '*.tmp.mjs',
      'node_modules/**',
      'public/assets/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },

  js.configs.recommended,

  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      // Size limits: the guardrail for one-responsibility-per-file.
      'max-lines': ['error', { max: 260, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 90, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 4],
      'max-params': ['error', 5],
      complexity: ['error', 16],

      // Correctness.
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-implicit-globals': 'error',
      'no-param-reassign': ['error', { props: false }],

      // Clarity.
      'prefer-template': 'error',
      'object-shorthand': ['error', 'always'],
      curly: ['error', 'multi-line'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Browser code.
  {
    files: ['src/**/*.js'],
    languageOptions: { globals: globals.browser },
  },

  // Build scripts and config run in Node.
  {
    files: ['scripts/**/*.mjs', '*.config.js', 'e2e/**/*.js'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },

  // The snapshot tool drives a browser: its `page.evaluate` callbacks are
  // serialised and run in the page, so they see `window` and not Node. Same
  // arrangement the end-to-end suite has, and for the same reason.
  {
    files: ['scripts/shoot/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },

  // Tests may be longer and noisier than production modules.
  {
    files: ['**/*.test.js', 'e2e/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
    },
  },

  prettier,
];
