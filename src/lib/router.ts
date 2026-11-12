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
  | { name: 'safety' };

export function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/');
  if (parts[0] === 'exercise' && parts[1]) return { name: 'exercise', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'workout') return { name: 'workout' };
  if (parts[0] === 'safety') return { name: 'safety' };
  return { name: 'home' };
}

export function href(route: Route): string {
  switch (route.name) {
    case 'exercise':
      return `#/exercise/${encodeURIComponent(route.id)}`;
    case 'workout':
      return '#/workout';
    case 'safety':
      return '#/safety';
    default:
      return '#/';
  }
}

let onRouteCb: (r: Route) => void = () => undefined;

export function navigate(route: Route): void {
  history.pushState({ inApp: true }, '', href(route));
  onRouteCb(route);
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
