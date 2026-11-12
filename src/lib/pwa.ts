import { registerSW } from 'virtual:pwa-register';

/**
 * Service worker registration + updates.
 *
 * An installed app on Android is usually *resumed* from the background, not
 * restarted, so a check only at page load would never see a new deploy. We
 * therefore also check whenever the app comes back to the foreground and
 * hourly while it stays open. A new version reloads the page by itself, but
 * never during workout mode (it waits until the workout is left).
 */
const HOURLY = 60 * 60 * 1000;

let reloadPending = false;
let inWorkout = (): boolean => false;

/** Reload now if an update is waiting and it is safe to interrupt. Returns true if reloading. */
export function applyPendingUpdate(): boolean {
  if (!reloadPending || inWorkout()) return false;
  reloadPending = false;
  window.location.reload();
  return true;
}

export function registerServiceWorker(opts: { isWorkoutActive: () => boolean }): void {
  if (!('serviceWorker' in navigator)) return;
  inWorkout = opts.isWorkoutActive;

  registerSW({
    immediate: true,
    // Called when a new version has taken control of this page.
    onNeedReload() {
      reloadPending = true;
      applyPendingUpdate();
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine && !registration.installing) registration.update().catch(() => undefined);
      };
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      window.setInterval(check, HOURLY);
    },
  });
}
