import { expect, test } from '@playwright/test';

/**
 * Screenshots every keyframe (and each mid-transition) of every exercise into
 * one grid image per theme: reports/poses-light.png / poses-dark.png.
 * Cells with an anatomy problem are outlined in red and fail the test.
 */
for (const theme of ['light', 'dark'] as const) {
  test(`pose grid (${theme})`, async ({ page }) => {
    const only = process.env.ONLY ? `&only=${process.env.ONLY}&w=360` : '';
    await page.goto(`/debug.html?theme=${theme}${only}`);
    await page.waitForSelector('body[data-ready="1"]');
    await page.screenshot({ path: `reports/poses-${theme}${process.env.ONLY ? '-' + process.env.ONLY.split(',')[0] : ''}.png`, fullPage: true });
    const bad = await page.locator('.debug-cell.bad figcaption').allTextContents();
    expect(bad, bad.join('\n')).toEqual([]);
  });
}
