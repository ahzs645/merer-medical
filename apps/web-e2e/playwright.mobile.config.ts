import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4300';
const executablePath = process.env.E2E_CHROMIUM_EXECUTABLE;

/**
 * Run against the production build with:
 *   npm exec nx -- build web
 *   npx playwright test --config apps/web-e2e/playwright.mobile.config.ts
 *
 * E2E_BASE_URL selects an already-running app instead of starting the local
 * preview. The tests use /demo and generated device readings only; they never
 * fetch a patient's shared package or touch the persistent record database.
 * E2E_WEB_SERVER_COMMAND can select a development server while iterating;
 * leave it unset for acceptance against the production build.
 */
export default defineConfig({
  testDir: './src',
  testMatch: 'mobile*.spec.ts',
  outputDir: resolve(__dirname, '../../test-results/mobile'),
  timeout: 90_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  maxFailures: process.env.CI ? 3 : undefined,
  reporter: 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    locale: 'en-CA',
    timezoneId: 'UTC',
    isMobile: true,
    hasTouch: true,
    contextOptions: { reducedMotion: 'reduce' },
    // A previous service worker must not hide a regression in the new build.
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [
    { name: 'phone-320', use: { viewport: { width: 320, height: 640 } } },
    {
      name: 'phone-390',
      use: {
        viewport: { width: 390, height: 844 },
        // Exercise the animated dialog/focus handoff as well as reduced motion.
        contextOptions: { reducedMotion: 'no-preference' },
      },
    },
    { name: 'phone-landscape', use: { viewport: { width: 844, height: 390 } } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command:
          process.env.E2E_WEB_SERVER_COMMAND || 'npm run preview:web:local',
        cwd: resolve(__dirname, '../..'),
        env: { PORT: '4300' },
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
});
