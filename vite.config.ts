import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves a project site from /<repo-name>/. The deploy workflow
// sets BASE_PATH to the repository name; locally the app lives at /.
// Only the last path segment is used, so `gym-app`, `/gym-app/` and paths
// rewritten by Git Bash on Windows (C:/Program Files/Git/gym-app/) all work.
const repo = (process.env.BASE_PATH ?? '').split(/[\\/]/).filter(Boolean).pop();
const base = repo ? `/${repo}/` : '/';

export default defineConfig({
  base,
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: { target: 'es2020' },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered in src/lib/pwa.ts
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: base,
        name: "Dad's Home Workout",
        short_name: 'Workout',
        description: 'A gentle, back-friendly home workout with two 10 kg dumbbells.',
        lang: 'en',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f3ede3',
        theme_color: '#2f5d46',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // A new version must take over at once: an installed app on Android is
        // resumed, never fully closed, so a "waiting" worker would wait forever.
        // src/lib/pwa.ts then reloads the page (but never mid-workout).
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
});
