import type { PlaywrightTestConfig } from '@playwright/test';

import { baseConfig } from '../../playwright.config.base';

const config: PlaywrightTestConfig = {
  ...baseConfig,
  // These journeys require the explicit phone projects and production preview
  // in playwright.mobile.config.ts, rather than this legacy desktop server.
  testIgnore: ['**/mobile-workflows.spec.ts'],
};

export default config;
