/**
 * Builds nothing: run `npm run build` first. Serves dist/ with `vite preview`,
 * runs Lighthouse (mobile) against it with your installed Chrome/Edge and
 * writes reports/lighthouse.html. Cross-platform (Windows included).
 *
 * Note: Lighthouse 12+ removed the "PWA" category. Installability is checked
 * here with Chrome's own DevTools check (Page.getInstallabilityErrors), the
 * same signal that drives the "Install app" prompt.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { preview } from 'vite';

const server = await preview({ preview: { port: 4174, strictPort: true } });
const url = 'http://localhost:4174/';
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new'] });
try {
  const result = await lighthouse(url, { port: chrome.port, output: 'html', logLevel: 'error' });
  mkdirSync('reports', { recursive: true });
  writeFileSync('reports/lighthouse.html', result.report);
  const cats = result.lhr.categories;
  for (const c of Object.values(cats)) console.log(`${c.title.padEnd(16)} ${Math.round(c.score * 100)}`);

  // Installability, straight from Chrome.
  const res = await fetch(`http://127.0.0.1:${chrome.port}/json/version`);
  const { webSocketDebuggerUrl } = await res.json();
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve) => {
      const msgId = ++id;
      const onMsg = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id === msgId) {
          ws.removeEventListener('message', onMsg);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', onMsg);
      ws.send(JSON.stringify({ id: msgId, method, params, sessionId }));
    });
  const { targetId } = await send('Target.createTarget', { url });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await new Promise((r) => setTimeout(r, 4000)); // let the service worker install
  await send('Page.reload', {}, sessionId);
  await new Promise((r) => setTimeout(r, 3000));
  const { installabilityErrors } = await send('Page.getInstallabilityErrors', {}, sessionId);
  console.log(installabilityErrors.length ? `NOT installable: ${JSON.stringify(installabilityErrors)}` : 'PWA installable ✓ (no installability errors)');
  ws.close();
  console.log('Full report: reports/lighthouse.html');
} finally {
  await chrome.kill();
  server.httpServer.close();
}
