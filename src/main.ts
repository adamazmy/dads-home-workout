import './styles/app.css';
import { type Screen } from './lib/dom';
import { registerServiceWorker } from './lib/pwa';
import { type Route, start } from './lib/router';
import { detailScreen } from './screens/detail';
import { homeScreen } from './screens/home';
import { safetyScreen } from './screens/safety';
import { workoutScreen } from './screens/workout';

const root = document.getElementById('app')!;
let current: Screen | null = null;
let currentRoute: Route = { name: 'home' };

function build(route: Route): Screen {
  switch (route.name) {
    case 'exercise':
      return detailScreen(route.id) ?? homeScreen();
    case 'workout':
      return workoutScreen();
    case 'safety':
      return safetyScreen();
    default:
      return homeScreen();
  }
}

function render(route: Route): void {
  currentRoute = route;
  current?.destroy?.();
  current = build(route);
  root.replaceChildren(current.el);
  document.title = route.name === 'home' ? current.title : `${current.title} · Dad's Home Workout`;
  window.scrollTo(0, 0);
  // Move focus to the new page heading for screen-reader and keyboard users.
  if (route.name !== 'home') current.el.querySelector<HTMLElement>('h1[tabindex]')?.focus({ preventScroll: true });
}

addEventListener('app:refresh', () => render(currentRoute));
start(render);
registerServiceWorker();
