import { expect, test } from '@playwright/test';
import { KEY, startWorkout } from './helpers';

for (const hash of ['#/exercise/%', '#/exercise/%C0%AF', '#/exercise/__proto__', '#/exercise/constructor', '#/exercise/toString', '#/exercise/%3Cimg%20src=x%20onerror=alert(1)%3E']) {
  test(`invalid deep link renders safe Home: ${hash}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('dialog', async (dialog) => {
      errors.push('unexpected dialog');
      await dialog.dismiss();
    });
    await page.goto(`/${hash}`);
    await expect(page.getByRole('heading', { name: "Today's workout", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
    await page.getByRole('button', { name: 'History', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible();
  });
}

test('corrupt saved records recover without losing valid workout history (incl. old A/B records)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((k) =>
    localStorage.setItem(
      k,
      JSON.stringify({
        history: [
          null,
          { date: '2024-02-29', workout: 'B' }, // old format: migrated
          { date: 'invalid', workout: 'A' },
          { id: '<img src=x onerror=alert(1)>', date: '2024-03-01', location: 'home', focus: 'full', exercises: [{ id: 'goblet', sets: 3 }] },
          { id: 'w-x', date: '2024-03-02', location: 'home', focus: 'full', exercises: [{ id: '__proto__', sets: 3 }] },
        ],
        progress: { workout: 'Z', index: 0, set: 1 },
      }),
    ), KEY);
  await page.reload();
  await expect(page.getByRole('heading', { name: "Today's workout", exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Carry on' })).toHaveCount(0);
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.locator('.logs > li')).toHaveCount(1);
  await expect(page.locator('.logs')).toContainText('Split squat holding a chair');
});

test('session privacy clears disk activity, preserves current progress, and stays opted out after reload', async ({ page }) => {
  await page.goto('/');
  await startWorkout(page);
  await page.getByRole('button', { name: 'Set done', exact: true }).click();
  await page.getByRole('button', { name: 'Leave workout (progress is saved)', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Session only', exact: true }).click();
  const disk = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY);
  expect(disk.progress).toBeNull();
  expect(disk.draft).toBeNull();
  expect(disk.history).toEqual([]);
  await page.goBack();
  await page.getByRole('button', { name: 'Carry on', exact: true }).click();
  await expect(page.getByText(/^Set 2 of \d$/)).toBeVisible();
  await page.goto('/#/settings'); // Full navigation intentionally ends the in-memory session.
  await expect(page.getByRole('button', { name: 'Session only', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Carry on', exact: true })).toHaveCount(0);
});

test('CSP blocks inline script while workout functionality remains available', async ({ page }) => {
  await page.goto('/');
  expect(await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')).toContain("script-src 'self'");
  await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.__inlineExecuted = true';
    document.body.append(script);
  });
  expect(await page.evaluate(() => Reflect.get(window, '__inlineExecuted'))).toBeUndefined();
  await startWorkout(page);
});

test('importing a malicious history file cannot inject markup or break the app', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', async (d) => {
    errors.push('unexpected dialog');
    await d.dismiss();
  });
  await page.goto('/#/history');
  const evil = JSON.stringify({
    app: 'dads-home-workout',
    history: [
      { id: 'ok-1', date: '2026-01-05', at: '2026-01-05T10:00:00Z', location: 'gym', focus: 'full', exercises: [{ id: 'latPulldown', sets: 3 }] },
      { id: '"><img src=x onerror=alert(1)>', date: '2026-01-06', location: 'home', focus: 'full', exercises: [{ id: 'goblet', sets: 3 }] },
      { id: 'proto', date: '2026-01-07', location: 'home', focus: 'full', exercises: [{ id: 'constructor', sets: 3 }] },
    ],
    walks: ['2026-01-05', '<script>'],
  });
  await page.locator('#import-file').setInputFiles({ name: 'h.json', mimeType: 'application/json', buffer: Buffer.from(evil) });
  await expect(page.getByRole('status')).toContainText('Imported 1 workout and 1 walk');
  await page.reload();
  await expect(page.locator('.logs > li')).toHaveCount(1);
  await expect(page.locator('.logs img')).toHaveCount(0);
  expect(errors).toEqual([]);
});
