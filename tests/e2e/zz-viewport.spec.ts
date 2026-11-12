import { test } from '@playwright/test';

/** Viewport-sized (not full-page) screenshots of Home, so the fixed tab bar sits where the user sees it. */
for (const scheme of ['light', 'dark'] as const) {
  test(`home viewport screenshot (${scheme})`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `reports/screens/${info.project.name}-${scheme}-home-viewport.png` });
  });
}
