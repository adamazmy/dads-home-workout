import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { type Page, expect, test } from '@playwright/test';

/**
 * An installed app on Android is resumed from the background rather than
 * restarted. A new deploy must still reach it, but never reload mid-workout.
 */
const SW = 'dist/sw.js';
let original = '';
test.beforeAll(() => {
  original = readFileSync(SW, 'utf8');
});
test.afterAll(() => writeFileSync(SW, original));

const deploy = (n: number) => appendFileSync(SW, `\n// simulated deploy ${n}\n`);
const resume = (page: Page) => page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
const mark = (page: Page) => page.evaluate(() => ((window as unknown as { __mark: number }).__mark = 1));
const reloaded = (page: Page) => page.evaluate(() => (window as unknown as { __mark?: number }).__mark !== 1);

test('a new deploy reaches a resumed app, but waits until the workout is left', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);

  // Resumed on Home → picks up the new version and reloads by itself.
  await mark(page);
  deploy(1);
  await resume(page);
  await expect.poll(() => reloaded(page), { timeout: 15_000 }).toBe(true);

  // Resumed during the rest timer → no reload, the timer keeps running.
  await page.getByRole('button', { name: /Start Workout/ }).click();
  await page.getByRole('button', { name: 'Set done' }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await mark(page);
  deploy(2);
  await resume(page);
  await page.waitForTimeout(5000);
  expect(await reloaded(page)).toBe(false);
  await expect(page.getByRole('timer')).toBeVisible();

  // Leaving the workout applies the waiting update; progress is kept.
  await page.getByRole('button', { name: /Leave workout/ }).click();
  await expect.poll(() => reloaded(page), { timeout: 15_000 }).toBe(true);
  await expect(page.getByRole('button', { name: 'Carry on' })).toBeVisible();
});
