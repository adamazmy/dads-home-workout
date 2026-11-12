import { type Page, expect, test } from '@playwright/test';

const shot = (page: Page, name: string) =>
  page.screenshot({ path: `reports/screens/${test.info().project.name}-${name}.png`, fullPage: true });

test.beforeEach(async ({ page }) => {
  // Record vibrations so the rest-timer alert can be asserted.
  await page.addInitScript(() => {
    (window as unknown as { __vibrations: unknown[] }).__vibrations = [];
    navigator.vibrate = ((p: VibratePattern) => {
      (window as unknown as { __vibrations: unknown[] }).__vibrations.push(p);
      return true;
    }) as Navigator['vibrate'];
  });
});

for (const scheme of ['light', 'dark'] as const) {
  test(`screens render without horizontal scroll (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Workout A', level: 1 })).toBeVisible();
    await expect(page.locator('.ex-item')).toHaveCount(6);
    const noOverflow = async () =>
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await noOverflow();
    await shot(page, `${scheme}-home`);

    await page.locator('.ex-item').first().click();
    await expect(page.getByRole('heading', { name: 'Goblet squat to a chair' })).toBeVisible();
    await noOverflow();
    await shot(page, `${scheme}-detail`);

    await page.goto('/#/exercise/rdl');
    await expect(page.getByText('Check with your physio')).toBeVisible();
    await shot(page, `${scheme}-detail-rdl`);

    await page.goto('/#/safety');
    await expect(page.getByRole('heading', { name: 'When to stop' })).toBeVisible();
    await noOverflow();
    await shot(page, `${scheme}-safety`);
  });
}

test('base font is at least 18px and tap targets are big', async ({ page }) => {
  await page.goto('/');
  const fontSize = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(18);
  for (const btn of await page.locator('.btn').all()) {
    const box = await btn.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(48);
  }
});

test('Android back closes the exercise detail instead of leaving the app', async ({ page }) => {
  await page.goto('/');
  await page.locator('.ex-item').nth(1).click();
  await expect(page).toHaveURL(/#\/exercise\/floorPress$/);
  await page.goBack();
  await expect(page).toHaveURL(/:4173\/(#\/)?$/); // still inside the app
  await expect(page.getByRole('heading', { name: 'Workout A', level: 1 })).toBeVisible();
});

test('opening a deep link, back still lands on Home', async ({ page }) => {
  await page.goto('/#/exercise/birdDog');
  await expect(page.getByRole('heading', { name: 'Bird dog' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Workout A', level: 1 })).toBeVisible();
});

test('workout mode: set done → rest timer with beep/vibration → next set; back exits and keeps progress', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Workout A' }).click();
  await expect(page.getByText('Set 1 of 3')).toBeVisible();
  await shot(page, 'workout-set');

  await page.getByRole('button', { name: 'Set done' }).click();
  await expect(page.getByRole('heading', { name: 'Rest' })).toBeVisible();
  await expect(page.getByRole('timer')).toHaveText('75');
  await shot(page, 'workout-rest');

  await page.clock.runFor(76_000);
  await expect(page.getByText('Set 2 of 3')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __vibrations: unknown[] }).__vibrations.length)).toBe(1);

  await page.getByRole('button', { name: 'Set done' }).click();
  await page.getByRole('button', { name: 'Skip rest' }).click();
  await expect(page.getByText('Set 3 of 3')).toBeVisible();

  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Workout A not finished' })).toBeVisible();
  await page.getByRole('button', { name: 'Carry on' }).click();
  await expect(page.getByText('Set 3 of 3')).toBeVisible();
});

test('core exercises rest 45 s; finishing shows the walk message and flips to Workout B', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Workout A' }).click();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Skip exercise' }).click();
  await expect(page.getByRole('heading', { name: 'Dead bug' })).toBeVisible();
  await page.getByRole('button', { name: 'Set done' }).click();
  await expect(page.getByRole('timer')).toHaveText('45');
  await page.getByRole('button', { name: 'Skip rest' }).click();
  await page.getByRole('button', { name: 'Skip exercise' }).click();
  await page.getByRole('button', { name: 'Skip exercise' }).click();
  await expect(page.getByRole('heading', { name: 'Done – go for a walk later.' })).toBeVisible();
  await shot(page, 'workout-done');
  await page.getByRole('button', { name: 'Back to home' }).click();
  await expect(page.getByRole('heading', { name: 'Workout B', level: 1 })).toBeVisible();
  await expect(page.locator('.day.done')).toHaveCount(1);
});

test('RDL can be swapped for step-ups', async ({ page }) => {
  await page.goto('/#/exercise/rdl');
  await page.getByRole('button', { name: /use step-up instead/i }).click();
  await page.goBack();
  await page.getByRole('button', { name: 'Do Workout B instead' }).click();
  await expect(page.locator('.ex-item .name').nth(1)).toHaveText('Step-up');
});

test('animation controls: pause, half speed, phase label changes', async ({ page }) => {
  await page.goto('/#/exercise/goblet');
  const phase = page.locator('.phase');
  const first = await phase.textContent();
  await expect(phase).not.toHaveText(first!, { timeout: 8000 });
  await page.getByRole('button', { name: '½ speed' }).click();
  await expect(page.getByRole('button', { name: '½ speed' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Pause animation' }).click();
  await expect(page.getByRole('button', { name: 'Play animation' })).toBeVisible();
});

test('PWA: manifest, service worker and Chrome installability', async ({ page, browserName }, info) => {
  test.skip(browserName !== 'chromium' || info.project.name !== 'desktop-chrome', 'CDP check runs once on Chromium');
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ name: "Dad's Home Workout", short_name: 'Workout', display: 'standalone' });
  expect(manifest.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}/${i.purpose}`)).toEqual(
    expect.arrayContaining(['192x192/any', '512x512/any', '512x512/maskable']),
  );
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  expect(installabilityErrors).toEqual([]);

  // Offline: reload with the network off and the app still starts.
  await page.reload();
  await page.context().setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.context().setOffline(false);
});

test('bottom tabs: This Week and Progress; Android back returns to Workouts', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'This Week' }).click();
  await expect(page.getByRole('heading', { name: 'This Week', level: 1 })).toBeVisible();
  await shot(page, 'tab-week');
  await page.getByRole('button', { name: 'Progress' }).click();
  await expect(page.getByRole('heading', { name: 'Progress', level: 1 })).toBeVisible();
  await expect(page.getByText('No workouts yet')).toBeVisible();
  await shot(page, 'tab-progress');
  // Tabs replace each other, so one back press lands on Home.
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Workout A', level: 1 })).toBeVisible();
});

test('settings: theme and RDL swap are remembered', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Step-ups' }).click();
  await shot(page, 'settings');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Step-ups' })).toHaveAttribute('aria-pressed', 'true');
});
