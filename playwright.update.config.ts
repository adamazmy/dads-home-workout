import { defineConfig } from '@playwright/test';

/** App-update test: rewrites dist/sw.js to simulate deploys, so it runs alone. */
export default defineConfig({
  testDir: 'tests/update',
  timeout: 90_000,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4176' },
  webServer: {
    command: 'npm run build && node scripts/serve-dist.mjs',
    url: 'http://localhost:4176',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
