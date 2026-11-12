import { defineConfig } from '@playwright/test';

/** Pose check: renders debug.html on the dev server and screenshots the grid. */
export default defineConfig({
  testDir: 'tests/poses',
  timeout: 60_000,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:5174', viewport: { width: 1500, height: 900 } },
  webServer: {
    command: 'npx vite --port 5174 --strictPort',
    url: 'http://localhost:5174/debug.html',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
