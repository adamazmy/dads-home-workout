import { EXERCISES, groupName } from '../data/exercises';
import { unlockAudio } from '../lib/alerts';
import { type Screen, h } from '../lib/dom';
import { icon } from '../lib/icons';
import { navigate } from '../lib/router';
import { type WorkoutLog, toggleWalk } from '../lib/storage';
import { type DayInfo, WALK_TEXT, cardTitle, tabBar, weekDays } from './chrome';
import { presetChoose } from './choose';

const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export function workoutSummary(log: WorkoutLog): string {
  const groups = [...new Set(log.exercises.map((e) => groupName(EXERCISES[e.id].group)))];
  return `${log.location === 'gym' ? 'Gym' : 'Home'} – ${groups.join(', ')}`;
}

function row(d: DayInfo): HTMLElement {
  const li = h('li', { class: `day-row${d.isToday ? ' is-today' : ''}` });
  li.append(h('span', { class: 'date' }, d.isToday ? 'Today' : d.name, h('small', {}, fmt(d.date))));
  const body = h('div', { class: 'day-body' });

  for (const w of d.workouts) body.append(h('span', { class: 'plan' }, icon('checkCircle', 24), workoutSummary(w)));
  if (d.isToday && !d.workouts.length) {
    body.append(
      h(
        'button',
        {
          class: 'btn btn-primary',
          type: 'button',
          onclick: () => {
            unlockAudio();
            presetChoose(null);
            navigate({ name: 'choose' });
          },
        },
        icon('play', 22),
        "Choose today's workout",
      ),
    );
  }
  if (!d.isFuture) {
    const btn = h('button', { class: 'btn', type: 'button', 'aria-pressed': String(d.walkDone) }, icon(d.walkDone ? 'check' : 'walk', 22), d.walkDone ? 'Walk done' : `${WALK_TEXT} – done?`);
    btn.addEventListener('click', () => {
      toggleWalk(d.iso);
      dispatchEvent(new Event('app:refresh'));
    });
    body.append(btn);
  } else {
    body.append(h('span', { class: 'status' }, 'To come'));
  }
  li.append(body);
  return li;
}

export function weekScreen(): Screen {
  const days = weekDays();
  const lifts = days.filter((d) => d.workouts.length).length;
  const walks = days.filter((d) => d.walkDone).length;
  const el = h(
    'main',
    { class: 'app has-tabbar' },
    h('header', { class: 'topbar' }, h('h1', { tabindex: '-1' }, 'This Week')),
    h(
      'section',
      { class: 'card', 'aria-labelledby': 'wk-h' },
      cardTitle('calendar', `${lifts} workout ${lifts === 1 ? 'day' : 'days'} · ${walks} ${walks === 1 ? 'walk' : 'walks'}`, 'wk-h'),
      h('ul', { class: 'day-rows' }, ...days.map(row)),
    ),
    h('p', { class: 'legend' }, icon('info', 22), 'Aim for 2–3 workouts a week with a rest day between them, and walk on the other days.'),
    tabBar('week'),
  );
  return { el, title: 'This Week' };
}
