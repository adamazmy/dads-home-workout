import { type Screen, h } from '../lib/dom';
import { icon } from '../lib/icons';
import { load } from '../lib/storage';
import { cardTitle, tabBar, weekDays } from './chrome';

const fmt = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/** Consecutive weeks (ending this week or last) with at least 2 workouts. */
function weekStreak(dates: string[]): number {
  const monday = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  };
  const perWeek = new Map<string, number>();
  for (const d of dates) perWeek.set(monday(d), (perWeek.get(monday(d)) ?? 0) + 1);
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
  let streak = 0;
  for (let i = 0; i < 104; i++) {
    const key = cursor.toISOString().slice(0, 10);
    const n = perWeek.get(key) ?? 0;
    if (n >= 2) streak++;
    else if (i > 0) break; // this week may still be in progress
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

const stat = (num: string | number, lbl: string) =>
  h('section', { class: 'card stat' }, h('p', { class: 'num', style: 'margin:0' }, String(num)), h('p', { class: 'lbl', style: 'margin:6px 0 0' }, lbl));

export function progressScreen(): Screen {
  const { history, walks } = load();
  const days = weekDays();
  const weekLifts = days.filter((d) => d.workoutDone).length;
  const weekWalks = days.filter((d) => !d.isWorkout && d.walkDone).length;
  const recent = [...history].reverse().slice(0, 10);

  const el = h(
    'main',
    { class: 'app has-tabbar' },
    h('header', { class: 'topbar' }, h('h1', { tabindex: '-1' }, 'Progress')),
    h(
      'div',
      { class: 'stats' },
      stat(`${weekLifts}/3`, 'Workouts this week'),
      stat(`${weekWalks}/4`, 'Walks this week'),
      stat(history.length, 'Workouts in total'),
      stat(weekStreak(history.map((x) => x.date)), 'Weeks in a row (2+ workouts)'),
    ),
    h(
      'section',
      { class: 'card', 'aria-labelledby': 'recent-h' },
      cardTitle('flame', 'Recent workouts', 'recent-h'),
      recent.length
        ? h('ul', { class: 'recent' }, ...recent.map((x) => h('li', {}, h('span', {}, fmt(x.date)), h('b', {}, `Workout ${x.workout}`))))
        : h('p', { class: 'meta', style: 'margin:0' }, 'No workouts yet – your first one will show up here.'),
    ),
    h('p', { class: 'legend' }, icon('info', 22), `Walks logged in total: ${walks.length}. Progress slowly: more reps first, then sets, then weight.`),
    tabBar('progress'),
  );
  return { el, title: 'Progress' };
}
