import { defineConfig } from '@playwright/test';

const PORT = 5179;

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts', // a distinct suffix keeps Vitest from collecting these files
  globalSetup: './e2e/global-setup.ts',
  timeout: 120_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1440, height: 900 },
    channel: 'chrome', // the installed Chrome, so the suite needs no browser download
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { DISABLE_HMR: 'true' },
  },
});
