import { PlaywrightTestConfig } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:4200/';

// Sandboxed/CI-cache environments can point tests at a system Chromium
// instead of downloading Playwright's pinned browser build.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

export const baseConfig: PlaywrightTestConfig = {
  retries: 2,
  maxFailures: 3,
  use: {
    baseURL,
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  timeout: 3 * 60 * 1000,
  reporter: process.env.CI ? 'dot' : 'list',
};
