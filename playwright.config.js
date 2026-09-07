import { defineConfig, devices } from '@playwright/test';

/**
 * CI machines have no GPU, so Chromium must be told to accept a software WebGL
 * implementation. Without these the context creation fails and every test
 * reports a blank canvas rather than the real problem.
 */
const launchOptions = {
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
};

export default defineConfig({
  testDir: './e2e',
  /* Serial on purpose. Every test drives a real WebGL scene, and on a machine
     with no GPU that is a software rasteriser competing for the same cores —
     run in parallel they starve each other and fail on timing rather than on
     behaviour. */
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions } },
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions } },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
