/**
 * Minimal static server for dist/ that re-reads files on every request, so a
 * test can change dist/sw.js to simulate a new deploy (vite preview caches
 * file sizes at startup and would serve the old bytes).
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain',
};
const port = Number(process.env.PORT ?? 4176);
createServer((req, res) => {
  let p = join('dist', decodeURIComponent((req.url ?? '/').split('?')[0]));
  if (!existsSync(p) || statSync(p).isDirectory()) p = join('dist', 'index.html');
  // Same caching header as GitHub Pages.
  res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream', 'cache-control': 'max-age=600' });
  res.end(readFileSync(p));
}).listen(port, () => console.log(`serving dist on http://localhost:${port}`));
