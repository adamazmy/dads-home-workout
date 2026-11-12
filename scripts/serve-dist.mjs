/**
 * Minimal static server for dist/ that re-reads files on every request, so a
 * test can change dist/sw.js to simulate a new deploy (vite preview caches
 * file sizes at startup and would serve the old bytes).
 */
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain',
};
export function createStaticServer(directory = 'dist') {
  const root = realpathSync(directory);
  const inside = file => { const rel = relative(root, file); return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel); };
  return createServer((req, res) => {
    const fail = status => { res.writeHead(status, { 'content-type': 'text/plain', 'cache-control': 'no-store' }); res.end('Request failed'); };
    let pathname;
    try { pathname = decodeURIComponent((req.url ?? '/').split('?')[0]); }
    catch { return fail(400); }
    if (!pathname.startsWith('/') || /[\0]/.test(pathname)) return fail(400);
    // Treat backslashes as separators on every platform, not just Windows.
    const candidate = resolve(root, `.${pathname.replaceAll('\\', '/')}`);
    if (!inside(candidate)) return fail(403);
    try {
      let file = realpathSync(candidate);
      if (!inside(file)) return fail(403);
      if (statSync(file).isDirectory()) file = realpathSync(resolve(file, 'index.html'));
      if (!inside(file)) return fail(403);
      const body = readFileSync(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'max-age=600', 'x-content-type-options': 'nosniff' });
      res.end(body);
    } catch (error) { fail(error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : 500); }
  });
}

export function startStaticServer(directory = 'dist', port = Number(process.env.PORT ?? 4176)) {
  return createStaticServer(directory).listen(port, '127.0.0.1');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const server = startStaticServer();
  server.on('listening', () => console.log(`serving dist on http://127.0.0.1:${server.address().port}`));
}
