import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './e2e/tests',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'API Tests',
      testMatch: /.*\.spec\.ts/
    }
  ],
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/e2e/results.xml' }]
  ],
  timeout: 30000,
  globalSetup: './e2e/setup/global.ts',
  globalTeardown: './e2e/setup/teardown.ts',
  outputDir: 'test-results/e2e',
};

export default config;
