import { registerSW } from 'virtual:pwa-register';

/** Registers the service worker (offline + install). Updates apply on the next launch. */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  registerSW({ immediate: true });
}
