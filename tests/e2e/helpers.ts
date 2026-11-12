import { type Page, expect } from '@playwright/test';

export const KEY = 'dhw.state.v1';

/** Seeds saved state before the app boots (replaces whatever was there). */
export async function seedState(page: Page, state: Record<string, unknown>): Promise<void> {
  await page.goto('/');
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(state)] as const);
}

/** A fixed plan, so workout tests don't depend on the randomised generator. */
export const DRAFT = { location: 'home', focus: 'custom', groups: ['legs', 'core'], exercises: ['goblet', 'deadBug'] };

/** Home → Choose → Start → warm-up → first set. */
export async function startWorkout(page: Page): Promise<void> {
  await page.getByRole('button', { name: "Choose today's workout" }).first().click();
  await page.getByRole('button', { name: 'Start workout' }).click();
  await expect(page.getByRole('heading', { name: /Warm up first/ })).toBeVisible();
  await page.getByRole('button', { name: "I'm warmed up – start" }).click();
  await expect(page.getByText(/^Set 1 of \d$/)).toBeVisible();
}

export const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
export const localDay = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
