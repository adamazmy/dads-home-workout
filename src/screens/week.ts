import { WALK_TEXT } from '../data/exercises';
import { unlockAudio } from '../lib/alerts';
import { type Screen, h } from '../lib/dom';
import { icon } from '../lib/icons';
import { navigate } from '../lib/router';
import { toggleWalk } from '../lib/storage';
import { type DayInfo, cardTitle, tabBar, weekDays } from './chrome';

const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function row(d: DayInfo): HTMLElement {
  const li = h('li', { class: `day-row${d.isToday ? ' is-today' : ''}` });
  li.append(h('span', { class: 'date' }, d.isToday ? 'Today' : d.name, h('small', {}, fmt(d.date))));

  if (d.isWorkout || d.workoutDone) {
    const letter = d.workoutDone ?? d.planned;
    li.append(h('span', { class: 'plan' }, icon('dumbbell', 26), letter ? `Workout ${letter}` : 'Workout'));
    if (d.workoutDone) li.append(h('span', { class: 'status ok' }, icon('checkCircle', 22), 'Done'));
    else if (d.isToday)
      li.append(
        h(
          'button',
          {
            class: 'btn btn-primary',
            type: 'button',
            onclick: () => {
              unlockAudio();
              navigate({ name: 'workout' });
            },
          },
          icon('play', 22),
          `Start Workout ${d.planned}`,
        ),
      );
    else li.append(h('span', { class: 'status' }, d.isPast ? 'Missed – no problem, just carry on' : 'Planned'));
  } else {
    li.append(h('span', { class: 'plan' }, icon('walk', 26), WALK_TEXT));
    if (d.isPast || d.isToday) {
      const btn = h(
        'button',
        { class: 'btn', type: 'button', 'aria-pressed': String(d.walkDone) },
        d.walkDone ? icon('check', 22) : null,
        d.walkDone ? 'Walk done' : 'Mark walk done',
      );
      btn.addEventListener('click', () => {
        toggleWalk(d.iso);
        dispatchEvent(new Event('app:refresh'));
      });
      li.append(btn);
    } else li.append(h('span', { class: 'status' }, 'Planned'));
  }
  return li;
}

export function weekScreen(): Screen {
  const days = weekDays();
  const lifts = days.filter((d) => d.workoutDone).length;
  const walks = days.filter((d) => !d.isWorkout && d.walkDone).length;
  const el = h(
    'main',
    { class: 'app has-tabbar' },
    h('header', { class: 'topbar' }, h('h1', { tabindex: '-1' }, 'This Week')),
    h(
      'section',
      { class: 'card', 'aria-labelledby': 'wk-h' },
      cardTitle('calendar', `${lifts} of 3 workouts · ${walks} of 4 walks`, 'wk-h'),
      h('ul', { class: 'day-rows' }, ...days.map(row)),
    ),
    h('p', { class: 'legend' }, icon('info', 22), 'Three workouts a week on Monday, Wednesday and Friday, alternating A and B. Walk on the other days.'),
    tabBar('week'),
  );
  return { el, title: 'This Week' };
}
