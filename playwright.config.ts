import { defineConfig, devices } from '@playwright/test';

// Runs against the production build (`vite preview`) so the service worker
// and manifest are the real ones. Works the same on Windows, macOS and Linux.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: 'pixel7', use: { ...devices['Pixel 7'] } },
    { name: 'small-375', use: { ...devices['Pixel 7'], viewport: { width: 375, height: 740 } } },
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
  ],
});
