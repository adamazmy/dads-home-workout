import { readFileSync } from 'node:fs';
import { type Page, expect, test } from '@playwright/test';
import { DRAFT, hoursAgo, localDay, seedState, startWorkout } from './helpers';

const shot = (page: Page, name: string) =>
  page.screenshot({ path: `reports/screens/${test.info().project.name}-${name}.png`, fullPage: true });
const noOverflow = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

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
    await seedState(page, { history: [{ id: 'w-1', date: localDay(hoursAgo(80)), at: hoursAgo(80), location: 'home', focus: 'full', exercises: [{ id: 'goblet', sets: 3 }, { id: 'row', sets: 3 }] }] });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: "Today's workout", level: 1 })).toBeVisible();
    await noOverflow(page);
    await shot(page, `${scheme}-home`);

    await page.getByRole('button', { name: "Choose today's workout" }).click();
    await expect(page.locator('.plan-item')).not.toHaveCount(0);
    await noOverflow(page);
    await shot(page, `${scheme}-choose`);

    await page.goto('/#/exercise/backExtension');
    await expect(page.getByText('Check with your physio')).toBeVisible();
    await noOverflow(page);
    await shot(page, `${scheme}-detail-backext`);

    for (const route of ['library', 'history', 'week', 'settings', 'safety']) {
      await page.goto(`/#/${route}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await noOverflow(page);
      await shot(page, `${scheme}-${route}`);
    }
  });
}

test('base font is at least 18px and tap targets are big', async ({ page }) => {
  await page.goto('/#/choose');
  const fontSize = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(18);
  for (const btn of await page.locator('.btn, .focus-option, .group-tile').all()) {
    const box = await btn.boundingBox();
    if (box) expect(box.height).toBeGreaterThanOrEqual(48);
  }
});

test('Android back closes the exercise detail instead of leaving the app', async ({ page }) => {
  await page.goto('/#/library');
  await page.locator('.ex-item').nth(1).click();
  await expect(page).toHaveURL(/#\/exercise\//);
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'All exercises' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: "Today's workout", level: 1 })).toBeVisible();
});

test('opening a deep link, back still lands on Home', async ({ page }) => {
  await page.goto('/#/exercise/birdDog');
  await expect(page.getByRole('heading', { name: 'Bird dog' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: "Today's workout", level: 1 })).toBeVisible();
});

test.describe('choosing a workout', () => {
  test('Full body is recommended and first; Home vs Gym changes the exercises', async ({ page }) => {
    await page.goto('/#/choose');
    const first = page.locator('.focus-option').first();
    await expect(first).toContainText('Full body');
    await expect(first).toContainText('Recommended');
    await expect(first).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.plan-item')).toHaveCount(6);
    const homeNames = await page.locator('.plan-item .name').allTextContents();
    expect(homeNames.join(' ')).not.toMatch(/machine|cable|pulldown|leg press/i);

    await page.getByRole('button', { name: 'Gym', exact: true }).click();
    await expect(page.locator('.plan-item')).toHaveCount(6);
  });

  test('Upper body has no leg exercises; Custom uses only the ticked groups', async ({ page }) => {
    await page.goto('/#/choose');
    await page.locator('.focus-option', { hasText: 'Upper body' }).click();
    await expect(page.locator('.plan-item .dose', { hasText: 'Legs' })).toHaveCount(0);

    await page.locator('.focus-option', { hasText: 'Custom' }).click();
    await expect(page.getByText('Tick at least one muscle group above.')).toBeVisible();
    await page.getByLabel('Arms').check();
    await expect(page.locator('.plan-item')).not.toHaveCount(0);
    for (const dose of await page.locator('.plan-item .dose').allTextContents()) expect(dose).toMatch(/^Arms/);
  });

  test('swap offers the same group; remove drops one; the draft survives the back button', async ({ page }) => {
    await page.goto('/#/choose');
    const firstName = await page.locator('.plan-item .name').first().textContent();
    await page.locator('.plan-item').first().getByRole('button', { name: 'Swap' }).click();
    const option = page.locator('.swap-option:not([disabled])').first();
    const newName = await option.locator('.name').textContent();
    await option.click();
    await expect(page.locator('.plan-item .name').first()).toHaveText(newName!);
    expect(newName).not.toBe(firstName);

    await page.locator('.plan-item').last().getByRole('button', { name: 'Remove' }).click();
    await expect(page.locator('.plan-item')).toHaveCount(5);

    await page.locator('.plan-item').first().getByRole('button', { name: 'How to' }).click();
    await page.goBack();
    await expect(page.locator('.plan-item')).toHaveCount(5);
    await expect(page.locator('.plan-item .name').first()).toHaveText(newName!);
  });

  test('guardrail: back-heavy exercises are greyed out within 48 h, with a plain reason', async ({ page }) => {
    const at = hoursAgo(20);
    await seedState(page, { history: [{ id: 'w-rdl', date: localDay(at), at, location: 'home', focus: 'lower', exercises: [{ id: 'rdl', sets: 3 }] }] });
    await page.goto('/#/choose');
    await page.locator('.focus-option', { hasText: 'Lower body' }).click();
    await expect(page.getByText(/No back-heavy exercises today/)).toBeVisible();
    await expect(page.locator('.plan-item .flag', { hasText: 'Back-heavy' })).toHaveCount(0);
    await page.locator('.plan-item').first().getByRole('button', { name: 'Swap' }).click();
    const rdl = page.locator('.swap-option', { hasText: 'Romanian deadlift' });
    await expect(rdl).toBeDisabled();
    await expect(rdl).toContainText('48 hours');
    await shot(page, 'guardrail-swap');
  });

  test('guardrail: only one back-heavy exercise per session', async ({ page }) => {
    await seedState(page, { draft: { location: 'home', focus: 'custom', groups: ['legs', 'core'], exercises: ['rdl', 'deadBug'] } });
    await page.goto('/#/choose');
    await page.locator('.plan-item', { hasText: 'Dead bug' }).getByRole('button', { name: 'Swap' }).click();
    const be = page.locator('.swap-option', { hasText: 'Back extension' });
    await expect(be).toBeDisabled();
    await expect(be).toContainText('Only one back-heavy exercise per session');
  });

  test('home equipment settings filter home workouts', async ({ page }) => {
    await page.goto('/#/settings');
    await page.getByLabel('Flat / adjustable bench').uncheck();
    await page.goto('/#/choose');
    for (let i = 0; i < 3; i++) {
      for (const name of await page.locator('.plan-item .name').allTextContents()) expect(name).not.toMatch(/bench|incline|seated (dumbbell|hammer|raise)|lying/i);
      await page.getByRole('button', { name: 'Shuffle' }).click();
    }
  });
});

test.describe('workout mode', () => {
  test('warm-up first → set done → rest timer (exercise rest) with vibration → next set; back keeps progress', async ({ page }) => {
    await page.clock.install();
    await seedState(page, { draft: DRAFT });
    await page.goto('/');
    await startWorkout(page);
    await expect(page.getByRole('heading', { name: 'Goblet squat to a chair' })).toBeVisible();
    await shot(page, 'workout-set');

    await page.getByRole('button', { name: 'Set done' }).click();
    await expect(page.getByRole('timer')).toHaveText('75');
    await shot(page, 'workout-rest');
    await page.clock.runFor(76_000);
    await expect(page.getByText('Set 2 of 3')).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __vibrations: unknown[] }).__vibrations.length)).toBe(1);

    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Workout not finished' })).toBeVisible();
    await page.getByRole('button', { name: 'Carry on' }).click();
    await expect(page.getByText('Set 2 of 3')).toBeVisible();
  });

  test('core rests 45 s; finishing saves history, updates Last trained and the week, and lands on Home', async ({ page }) => {
    await seedState(page, { draft: DRAFT });
    await page.goto('/');
    await startWorkout(page);
    await page.getByRole('button', { name: 'Set done' }).click();
    await page.getByRole('button', { name: 'Skip rest' }).click();
    await page.getByRole('button', { name: 'Skip exercise' }).click();
    await expect(page.getByRole('heading', { name: 'Dead bug' })).toBeVisible();
    await page.getByRole('button', { name: 'Set done' }).click();
    await expect(page.getByRole('timer')).toHaveText('45');
    await page.getByRole('button', { name: 'Skip rest' }).click();
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Finish now' }).click();
    await expect(page.getByRole('heading', { name: 'Done – go for a walk later.' })).toBeVisible();
    await expect(page.getByText('2 exercises, 2 sets')).toBeVisible();
    await shot(page, 'workout-done');

    await page.getByRole('button', { name: 'Back to home' }).click();
    await expect(page.getByRole('heading', { name: "Today's workout", level: 1 })).toBeVisible();
    await expect(page.locator('.group-tile', { hasText: 'Legs & glutes' })).toContainText('Today');
    await expect(page.locator('.group-tile', { hasText: 'Chest' })).toContainText('Not yet');
    await expect(page.locator('.day.today.done')).toHaveCount(1);

    await page.getByRole('button', { name: 'History', exact: true }).click();
    await expect(page.locator('.logs > li')).toHaveCount(1);
    await expect(page.locator('.logs')).toContainText('Goblet squat to a chair – 1 set');
  });
});

test('history export / import round-trip', async ({ page }) => {
  const at = hoursAgo(30);
  await seedState(page, { history: [{ id: 'w-a', date: localDay(at), at, location: 'gym', focus: 'upper', exercises: [{ id: 'latPulldown', sets: 3 }] }], walks: [localDay(at)] });
  await page.goto('/#/history');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export', exact: true }).click()]);
  expect(download.suggestedFilename()).toMatch(/^workout-history-\d{4}-\d{2}-\d{2}\.json$/);
  const file = readFileSync(await download.path(), 'utf8');
  expect(JSON.parse(file)).toMatchObject({ app: 'dads-home-workout', history: [{ id: 'w-a' }] });

  // New phone: empty app, import the file.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText('No workouts yet')).toBeVisible();
  await page.locator('#import-file').setInputFiles({ name: 'h.json', mimeType: 'application/json', buffer: Buffer.from(file) });
  await expect(page.getByRole('status')).toContainText('Imported 1 workout and 1 walk');
  await page.reload();
  await expect(page.locator('.logs')).toContainText('Lat pulldown – 3 sets');
});

test('animation controls: pause, half speed, phase label changes', async ({ page }) => {
  await page.goto('/#/exercise/legPress');
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

test('bottom tabs: This Week and History; Android back returns to Workouts', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'This Week' }).click();
  await expect(page.getByRole('heading', { name: 'This Week', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: /Walk 20–30 min – done\?/ }).last().click();
  await expect(page.getByRole('button', { name: 'Walk done' })).toHaveCount(1);
  await shot(page, 'tab-week');
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'History', level: 1 })).toBeVisible();
  await shot(page, 'tab-history');
  await page.goBack();
  await expect(page.getByRole('heading', { name: "Today's workout", level: 1 })).toBeVisible();
});

test('settings: theme is remembered', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await shot(page, 'settings');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
