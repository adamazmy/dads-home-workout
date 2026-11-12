/** Renders the PWA icons to PNG with Playwright's Chromium (no native image deps, works on Windows). */
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { iconSvg } from './icon.svg.mjs';

const out = [
  ['public/icons/icon-192.png', 192, { pad: 0.1, rounded: true }],
  ['public/icons/icon-512.png', 512, { pad: 0.1, rounded: true }],
  ['public/icons/maskable-512.png', 512, { pad: 0.2, rounded: false }],
  ['public/icons/apple-touch-icon.png', 180, { pad: 0.12, rounded: false }],
];

writeFileSync('public/favicon.svg', iconSvg({ size: 64, pad: 0.08, rounded: true }));
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, opts] of out) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${iconSvg({ size, ...opts })}`);
  await page.locator('svg').screenshot({ path: file, omitBackground: true });
  console.log('wrote', file);
}
await browser.close();
