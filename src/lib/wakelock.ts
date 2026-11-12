/** Keeps the screen on during workout mode (Screen Wake Lock API). */
let sentinel: WakeLockSentinel | null = null;
let wanted = false;

export const wakeLockSupported = (): boolean => 'wakeLock' in navigator;

async function acquire(): Promise<boolean> {
  if (!wakeLockSupported() || document.visibilityState !== 'visible') return false;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => (sentinel = null));
    return true;
  } catch {
    return false; // e.g. battery saver on, or not a secure context
  }
}

// The browser drops the lock whenever the page is hidden; take it back on return.
document.addEventListener('visibilitychange', () => {
  if (wanted && !sentinel && document.visibilityState === 'visible') void acquire();
});

/** Resolves false if the screen may still turn off (unsupported or refused). */
export async function keepScreenOn(): Promise<boolean> {
  wanted = true;
  return acquire();
}

export async function releaseScreen(): Promise<void> {
  wanted = false;
  await sentinel?.release().catch(() => undefined);
  sentinel = null;
}
