import { defineConfig } from '@playwright/test';

// L8 T4: the installed app's smoke test, apart from the gate's e2e suite because it needs the installer that
// `npm run dist` writes to release/. Run it with `npm run smoke`.
export default defineConfig({
  testDir: 'installed',
  testMatch: '**/*.e2e.ts',
  timeout: 300_000,
  workers: 1,
});
