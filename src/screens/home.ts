import type { Player } from '../anim/player';
import { WALK_TEXT, WORKOUTS, WORKOUT_DAYS, type WorkoutId } from '../data/exercises';
import { unlockAudio } from '../lib/alerts';
import { type Screen, h } from '../lib/dom';
import { estimateMinutes, workoutExercises } from '../lib/plan';
import { href, navigate } from '../lib/router';
import { load, localDate, save } from '../lib/storage';
import { createThumb } from './stage';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function weekStrip(): HTMLElement {
  const { history } = load();
  const done = new Set(history.map((x) => x.date));
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  const items = DAYS.map((name, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = localDate(d);
    const isWorkout = WORKOUT_DAYS.includes(i);
    const isToday = iso === localDate(today);
    const isDone = done.has(iso);
    const what = isDone ? '✓' : isWorkout ? 'Lift' : 'Walk';
    const label = `${name}${isToday ? ' (today)' : ''}: ${isWorkout ? 'workout' : WALK_TEXT}${isDone ? ', done' : ''}`;
    return h(
      'li',
      { class: `day${isToday ? ' today' : ''}${isDone ? ' done' : ''}`, 'aria-label': label },
      h('b', { 'aria-hidden': 'true' }, name),
      h('span', { class: 'what', 'aria-hidden': 'true' }, what),
    );
  });
  return h(
    'section',
    { class: 'card', 'aria-labelledby': 'week-h' },
    h('h2', { id: 'week-h' }, 'This week'),
    h('ul', { class: 'week' }, ...items),
    h('p', { class: 'legend' }, `Lift = workout (alternate A and B). Walk = ${WALK_TEXT.toLowerCase()}.`),
  );
}

export function homeScreen(): Screen {
  const state = load();
  const players: Player[] = [];
  const nextId: WorkoutId = state.next;
  const other: WorkoutId = nextId === 'A' ? 'B' : 'A';
  const list = workoutExercises(nextId);

  const start = () => {
    unlockAudio(); // Chrome needs a tap before it will play the rest-timer beep
    save({ progress: null });
    navigate({ name: 'workout' });
  };

  const resume = state.progress
    ? h(
        'section',
        { class: 'card warn', 'aria-labelledby': 'resume-h' },
        h('h2', { id: 'resume-h' }, `Workout ${state.progress.workout} not finished`),
        h('p', {}, `You stopped at exercise ${state.progress.index + 1} of ${WORKOUTS[state.progress.workout].exercises.length}.`),
        h(
          'button',
          {
            class: 'btn btn-primary btn-block',
            type: 'button',
            onclick: () => {
              unlockAudio();
              navigate({ name: 'workout' });
            },
          },
          'Carry on',
        ),
      )
    : null;

  const hero = h(
    'section',
    { class: 'card hero', 'aria-labelledby': 'next-h' },
    h('p', { class: 'kicker' }, 'Next workout'),
    h('h1', { id: 'next-h' }, WORKOUTS[nextId].name),
    h('p', { class: 'meta' }, `${list.length} exercises · about ${estimateMinutes(list)} minutes`),
    h('button', { class: 'btn btn-primary btn-big', type: 'button', onclick: start }, `Start ${WORKOUTS[nextId].name}`),
    h(
      'button',
      {
        class: 'link-btn',
        type: 'button',
        onclick: () => {
          save({ next: other, progress: null });
          dispatchEvent(new Event('app:refresh'));
        },
      },
      `Do ${WORKOUTS[other].name} instead`,
    ),
  );

  const items = list.map((ex) => {
    const thumb = createThumb(ex);
    players.push(thumb.player);
    return h(
      'li',
      {},
      h(
        'a',
        { class: 'ex-item', href: href({ name: 'exercise', id: ex.id }), 'data-ex': ex.id },
        thumb.el,
        h(
          'span',
          {},
          h('span', { class: 'name' }, ex.name),
          h('span', { class: 'dose' }, `${ex.sets} × ${ex.dose}`),
          ex.flag ? h('span', { class: 'flag' }, '⚠ Ask physio first') : null,
        ),
        h('span', { class: 'chev', 'aria-hidden': 'true' }, '›'),
      ),
    );
  });
  const listEl = h('ul', { class: 'ex-list' }, ...items);
  // Links push a history entry so the Android back button returns here.
  listEl.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-ex]');
    if (!a) return;
    e.preventDefault();
    navigate({ name: 'exercise', id: a.dataset.ex! });
  });

  const el = h(
    'main',
    { class: 'app' },
    h('header', { class: 'topbar' }, h('p', { class: 'kicker', style: 'margin:0' }, "Dad's Home Workout")),
    resume,
    hero,
    weekStrip(),
    h(
      'section',
      { 'aria-labelledby': 'list-h', class: 'stack' },
      h('h2', { id: 'list-h' }, `${WORKOUTS[nextId].name} – the exercises`),
      listEl,
    ),
    h(
      'nav',
      { class: 'footer-nav card' },
      h('h2', {}, 'Before you start'),
      h('p', {}, 'Warm-up, breathing, and when to stop.'),
      h(
        'a',
        {
          class: 'btn btn-block',
          href: href({ name: 'safety' }),
          onclick: (e: Event) => {
            e.preventDefault();
            navigate({ name: 'safety' });
          },
        },
        '🛡 Safety & back care',
      ),
    ),
  );

  return { el, title: "Dad's Home Workout", destroy: () => players.forEach((p) => p.destroy()) };
}
