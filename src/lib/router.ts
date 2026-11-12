/**
 * Hash router (GitHub Pages has no server-side fallback).
 *
 * Android back button: every in-app screen change pushes a history entry, so
 * "back" closes the exercise detail or leaves workout mode instead of leaving
 * the app. If the app is opened directly on an inner page, a Home entry is
 * inserted underneath so back still lands on Home.
 */
export type Route =
  | { name: 'home' }
  | { name: 'exercise'; id: string }
  | { name: 'workout' }
  | { name: 'safety' }
  | { name: 'week' }
  | { name: 'history' }
  | { name: 'settings' }
  | { name: 'choose' }
  | { name: 'library' };

/** Top-level tabs of the bottom bar. */
export const TABS = ['home', 'week', 'history'] as const;
const SIMPLE = ['workout', 'safety', 'week', 'history', 'settings', 'choose', 'library'] as const;

export function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/');
  if (parts[0] === 'exercise' && parts[1]) {
    try { return { name: 'exercise', id: decodeURIComponent(parts[1]) }; }
    catch { return { name: 'home' }; }
  }
  const simple = SIMPLE.find((n) => n === parts[0]);
  if (simple) return { name: simple };
  return { name: 'home' };
}

export function href(route: Route): string {
  switch (route.name) {
    case 'exercise':
      return `#/exercise/${encodeURIComponent(route.id)}`;
    case 'home':
      return '#/';
    default:
      return `#/${route.name}`;
  }
}

let onRouteCb: (r: Route) => void = () => undefined;

export function navigate(route: Route, opts: { replace?: boolean } = {}): void {
  if (opts.replace) history.replaceState(history.state, '', href(route));
  else history.pushState({ inApp: true }, '', href(route));
  onRouteCb(route);
}

/**
 * Bottom-bar tabs sit one level above Home, so the Android back button from
 * any tab returns to Home and a second back leaves the app.
 */
export function goTab(tab: (typeof TABS)[number]): void {
  const current = parse(location.hash).name;
  if (tab === current) return;
  if (tab === 'home') return back();
  navigate({ name: tab }, { replace: current !== 'home' && (TABS as readonly string[]).includes(current) });
}

/** Go back one screen; if there is nothing in-app to go back to, go Home. */
export function back(): void {
  if ((history.state as { inApp?: boolean } | null)?.inApp) history.back();
  else {
    history.replaceState(null, '', href({ name: 'home' }));
    onRouteCb({ name: 'home' });
  }
}

export function start(onRoute: (r: Route) => void): void {
  onRouteCb = onRoute;
  const initial = parse(location.hash);
  if (initial.name !== 'home') {
    history.replaceState(null, '', href({ name: 'home' }));
    history.pushState({ inApp: true }, '', href(initial));
  }
  addEventListener('popstate', () => onRoute(parse(location.hash)));
  onRoute(initial);
}
