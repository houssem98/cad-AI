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
  // The real server: it owns the executor and serves the agent and document routes, on recorded model responses
  // (MODEL_MODE=record with DEEPSEEK_API_KEY set records a missing one), with a fresh store each run.
  webServer: {
    command: 'npx tsx server.ts',
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { PORT: String(PORT), DISABLE_HMR: 'true', MODEL_MODE: process.env.MODEL_MODE ?? 'replay', CAD_DATA_DIR: 'e2e/.fixtures/server-data', CAD_DATA_FRESH: '1' },
  },
});
