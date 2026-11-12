import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { startStaticServer } from '../../scripts/serve-dist.mjs';

const dir = mkdtempSync(join(tmpdir(), 'gym-security-'));
const root = join(dir, 'dist'); mkdirSync(root);
writeFileSync(join(root, 'index.html'), '<h1>Workout</h1>');
writeFileSync(join(dir, 'private.txt'), 'outside');
// Directory junctions work without Windows symlink privileges.
mkdirSync(join(dir, 'outside')); writeFileSync(join(dir, 'outside', 'secret.txt'), 'outside');
symlinkSync(join(dir, 'outside'), join(root, 'escape'), 'junction');
const server = startStaticServer(root, 0);
before(async () => { if (!server.listening) await new Promise(resolve => server.once('listening', resolve)); });
after(async () => { await new Promise(resolve => server.close(resolve)); rmSync(dir, { recursive: true, force: true }); });
const get = path => new Promise((resolve, reject) => {
  const req = request({ host: '127.0.0.1', port: server.address().port, path }, res => {
    let body = ''; res.setEncoding('utf8'); res.on('data', chunk => body += chunk); res.on('end', () => resolve({ status: res.statusCode, body }));
  }); req.on('error', reject); req.end();
});
test('default listener is loopback', () => assert.equal(server.address().address, '127.0.0.1'));
test('valid content is served', async () => assert.equal((await get('/')).status, 200));
for (const path of ['/%2e%2e/private.txt', '/../private.txt', '/..%5cprivate.txt', '/escape/secret.txt']) {
  test(`rejects traversal ${path}`, async () => { const res = await get(path); assert.equal(res.status, 403); assert.ok(!res.body.includes('outside')); });
}
for (const path of ['/%', '/%C0%AF', '/%00']) {
  test(`malformed request ${path} does not stop serving`, async () => { assert.equal((await get(path)).status, 400); assert.equal((await get('/')).status, 200); });
}
test('missing assets return 404 instead of HTML', async () => assert.equal((await get('/missing.js')).status, 404));
