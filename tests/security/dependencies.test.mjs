import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
test('Workbox glob and minimatch are beyond the affected advisory ranges', () => {
  for (const name of ['glob', 'minimatch']) {
    const entries = Object.entries(lock.packages).filter(([path]) => path.endsWith(`/node_modules/${name}`) || path === `node_modules/${name}`);
    assert.ok(entries.length);
    for (const [, entry] of entries) {
      const [major, minor, patch] = entry.version.split('.').map(Number);
      if (name === 'glob') assert.ok(major > 14 || (major === 14 && (minor > 0 || patch >= 2)), entry.version);
      else assert.ok(major < 7 || major > 11 || (major === 11 && (minor > 0 || patch >= 1)), entry.version);
    }
  }
});
test('patched glob still supports the synchronous Workbox API', () => {
  const workboxRequire = createRequire(import.meta.resolve('workbox-build'));
  const glob = workboxRequire('glob');
  assert.ok(glob.globSync('*.html', { cwd: '.', nodir: true }).includes('index.html'));
});
