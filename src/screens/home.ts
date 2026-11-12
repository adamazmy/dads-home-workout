import type { Player } from '../anim/player';
import { WALK_TEXT, WORKOUTS, type WorkoutId } from '../data/exercises';
import { unlockAudio } from '../lib/alerts';
import { type Screen, h } from '../lib/dom';
import { icon } from '../lib/icons';
import { estimateMinutes, workoutExercises } from '../lib/plan';
import { href, navigate } from '../lib/router';
import { load, save } from '../lib/storage';
import { cardTitle, heroArt, tabBar, weekDays } from './chrome';
import { createThumb } from './stage';

function greeting(now = new Date()): string {
  const hr = now.getHours();
  return hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
}

export function weekCard(): HTMLElement {
  const items = weekDays().map((d) => {
    // A workout counts whichever day it was done on.
    const done = d.workoutDone !== null || (!d.isWorkout && d.walkDone);
    const what = done ? 'Done' : d.isWorkout ? 'Lift' : 'Walk';
    const label = `${d.name}${d.isToday ? ' (today)' : ''}: ${d.isWorkout ? 'workout' : WALK_TEXT}${done ? ', done' : ''}`;
    return h(
      'li',
      { class: `day${d.isToday ? ' today' : ''}${done ? ' done' : ''}`, 'aria-label': label },
      h('b', { 'aria-hidden': 'true' }, d.name),
      h('span', { class: 'what', 'aria-hidden': 'true' }, what),
      icon(done ? 'checkCircle' : d.isWorkout ? 'dumbbell' : 'walk', 24),
    );
  });
  return h(
    'section',
    { class: 'card', 'aria-labelledby': 'week-h' },
    cardTitle('calendar', 'This Week', 'week-h'),
    h('ul', { class: 'week' }, ...items),
    h('p', { class: 'legend' }, icon('info', 22), `Lift = workout (alternate A and B). Walk = ${WALK_TEXT.toLowerCase()}.`),
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
        { class: 'warn', 'aria-labelledby': 'resume-h' },
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
          icon('play', 22),
          'Carry on',
        ),
      )
    : null;

  const hero = h(
    'section',
    { class: 'hero', 'aria-labelledby': 'next-h' },
    heroArt(),
    h('h1', { id: 'next-h' }, WORKOUTS[nextId].name),
    h(
      'p',
      { class: 'hero-meta' },
      h('span', {}, icon('dumbbell', 26), `${list.length} exercises`),
      h('span', { class: 'divider', 'aria-hidden': 'true' }),
      h('span', {}, icon('clock', 24), `About ${estimateMinutes(list)} minutes`),
    ),
    h(
      'div',
      { class: 'hero-actions' },
      h('button', { class: 'btn btn-cream', type: 'button', onclick: start }, icon('play', 26), `Start ${WORKOUTS[nextId].name}`),
      h(
        'button',
        {
          class: 'btn btn-ghost-light',
          type: 'button',
          onclick: () => {
            save({ next: other, progress: null });
            dispatchEvent(new Event('app:refresh'));
          },
        },
        icon('swap', 24),
        `Do ${WORKOUTS[other].name} instead`,
      ),
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
          ex.flag ? h('span', { class: 'flag' }, icon('warning', 16), 'Ask physio first') : null,
        ),
        h('span', { class: 'chev' }, icon('chevronRight', 26)),
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

  const beforeStart = h(
    'section',
    { class: 'card', 'aria-labelledby': 'before-h' },
    cardTitle('shield', 'Before You Start', 'before-h'),
    h(
      'ul',
      { class: 'checklist' },
      ...['Warm up for 5–10 minutes', 'Breathe out on the effort – never hold your breath', 'Stop if anything feels sharp or painful'].map((t) =>
        h('li', {}, icon('checkCircle', 26), t),
      ),
    ),
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
      'Safety & back care',
    ),
  );

  const first = list[0]!;
  const demo = createThumb(first);
  players.push(demo.player);
  const howTo = h(
    'a',
    {
      class: 'card howto',
      href: href({ name: 'exercise', id: first.id }),
      onclick: (e: Event) => {
        e.preventDefault();
        navigate({ name: 'exercise', id: first.id });
      },
    },
    h('div', { class: 'howto-stage' }, demo.el, h('span', { class: 'play-badge', 'aria-hidden': 'true' }, icon('play', 30))),
    h('h2', {}, 'How to do the exercises'),
    h('p', { class: 'meta', style: 'margin:0 4px' }, 'Slow animated demos, step by step.'),
  );
  demo.el.classList.remove('thumb');

  const el = h(
    'main',
    { class: 'app wide has-tabbar' },
    h(
      'header',
      { class: 'greeting' },
      h('span', { class: 'wave', 'aria-hidden': 'true' }, '💪'),
      h('div', {}, h('p', { class: 'hello' }, greeting()), h('p', {}, 'Ready for your workout?')),
      h(
        'button',
        { class: 'icon-btn', type: 'button', 'aria-label': 'Settings', onclick: () => navigate({ name: 'settings' }) },
        icon('gear', 28),
      ),
    ),
    resume,
    hero,
    weekCard(),
    h(
      'div',
      { class: 'home-grid' },
      h(
        'section',
        { 'aria-labelledby': 'list-h' },
        h('h2', { id: 'list-h', class: 'section-title' }, `${WORKOUTS[nextId].name} – The Exercises`),
        listEl,
      ),
      h('aside', {}, beforeStart, howTo),
    ),
    tabBar('home'),
  );

  return { el, title: "Dad's Home Workout", destroy: () => players.forEach((p) => p.destroy()) };
}
