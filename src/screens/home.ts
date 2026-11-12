import type { Player } from '../anim/player';
import { EXERCISES, type MuscleGroup } from '../data/exercises';
import { unlockAudio } from '../lib/alerts';
import { type Screen, h } from '../lib/dom';
import { lastTrained, mostOverdue, whenText } from '../lib/generator';
import { icon } from '../lib/icons';
import { href, navigate } from '../lib/router';
import { load, save } from '../lib/storage';
import { WALK_TEXT, cardTitle, heroArt, tabBar, weekDays } from './chrome';
import { presetChoose } from './choose';
import { createThumb } from './stage';

function greeting(now = new Date()): string {
  const hr = now.getHours();
  return hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
}

const go = (route: Parameters<typeof navigate>[0]) => (e: Event) => {
  e.preventDefault();
  navigate(route);
};

export function weekCard(): HTMLElement {
  const items = weekDays().map((d) => {
    const lifted = d.workouts.length > 0;
    const what = lifted ? 'Lift' : d.walkDone ? 'Walk' : d.isFuture || d.isToday ? '' : 'Rest';
    const label = `${d.name}${d.isToday ? ' (today)' : ''}: ${lifted ? 'workout done' : d.walkDone ? 'walk done' : d.isFuture ? 'to come' : 'nothing logged'}`;
    return h(
      'li',
      { class: `day${d.isToday ? ' today' : ''}${lifted || d.walkDone ? ' done' : ''}`, 'aria-label': label },
      h('b', { 'aria-hidden': 'true' }, d.name),
      h('span', { class: 'what', 'aria-hidden': 'true' }, what || ' '),
      lifted ? icon('checkCircle', 24) : d.walkDone ? icon('walk', 24) : h('span', { class: 'icon-spacer', 'aria-hidden': 'true' }),
    );
  });
  return h(
    'section',
    { class: 'card', 'aria-labelledby': 'week-h' },
    cardTitle('calendar', 'This Week', 'week-h'),
    h('ul', { class: 'week' }, ...items),
    h('p', { class: 'legend' }, icon('info', 22), `Aim for 2–3 workouts a week, and a ${WALK_TEXT.toLowerCase()} on the other days.`),
  );
}

function lastTrainedCard(): HTMLElement {
  const { history } = load();
  const due = mostOverdue(history);
  const tiles = lastTrained(history).map((g) =>
    h(
      'li',
      {},
      h(
        'button',
        {
          class: `group-tile${due?.group === g.group ? ' due' : ''}`,
          type: 'button',
          'aria-label': `${g.name}: last trained ${whenText(g.days).toLowerCase()}. Build a workout for ${g.name}.`,
          onclick: () => {
            unlockAudio();
            presetChoose([g.group as MuscleGroup]);
            navigate({ name: 'choose' });
          },
        },
        h('span', { class: 'g-name' }, g.name),
        h('span', { class: 'g-when' }, whenText(g.days)),
        due?.group === g.group ? h('span', { class: 'due-pill' }, 'Due') : null,
      ),
    ),
  );
  return h(
    'section',
    { class: 'card', 'aria-labelledby': 'trained-h' },
    cardTitle('clock', 'Last trained', 'trained-h'),
    h('ul', { class: 'group-grid' }, ...tiles),
    h(
      'p',
      { class: 'legend' },
      icon('info', 22),
      due
        ? `${due.name} ${due.days === null ? 'hasn’t had a turn yet' : `was last trained ${due.days} days ago`} – a Full body workout includes it, or tap it to focus on it.`
        : history.length
          ? 'Nicely balanced. Tap a muscle group to focus on it.'
          : 'Your workouts will show up here. Tap a muscle group to focus on it.',
    ),
  );
}

export function homeScreen(): Screen {
  const state = load();
  const players: Player[] = [];

  const choose = () => {
    unlockAudio(); // a tap now lets Chrome play the rest-timer beep later
    presetChoose(null);
    navigate({ name: 'choose' });
  };

  const resume = state.progress
    ? h(
        'section',
        { class: 'warn', 'aria-labelledby': 'resume-h' },
        h('h2', { id: 'resume-h' }, 'Workout not finished'),
        h(
          'p',
          {},
          `You stopped at ${EXERCISES[state.progress.plan.exercises[state.progress.index]!].name.toLowerCase()} (exercise ${state.progress.index + 1} of ${state.progress.plan.exercises.length}).`,
        ),
        h(
          'div',
          { class: 'row' },
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
            'Carry on',
          ),
          h(
            'button',
            {
              class: 'btn',
              type: 'button',
              onclick: () => {
                if (confirm('Throw away this unfinished workout? Sets already done will not be saved.')) {
                  save({ progress: null });
                  dispatchEvent(new Event('app:refresh'));
                }
              },
            },
            'Discard',
          ),
        ),
      )
    : null;

  const due = mostOverdue(state.history);
  const hero = h(
    'section',
    { class: 'hero', 'aria-labelledby': 'next-h' },
    heroArt(),
    h('h1', { id: 'next-h' }, "Today's workout"),
    h(
      'p',
      { class: 'hero-meta' },
      h('span', {}, icon('dumbbell', 26), 'Home or gym'),
      h('span', { class: 'divider', 'aria-hidden': 'true' }),
      h('span', {}, icon('clock', 24), 'About 40 minutes'),
    ),
    due ? h('p', { class: 'hero-hint' }, `Most overdue: ${due.name}.`) : null,
    h(
      'div',
      { class: 'hero-actions' },
      h('button', { class: 'btn btn-cream', type: 'button', onclick: choose }, icon('play', 26), "Choose today's workout"),
      h('a', { class: 'btn btn-ghost-light', href: href({ name: 'library' }), onclick: go({ name: 'library' }) }, icon('dumbbell', 24), 'All exercises'),
    ),
  );

  const beforeStart = h(
    'section',
    { class: 'card', 'aria-labelledby': 'before-h' },
    cardTitle('shield', 'Before You Start', 'before-h'),
    h(
      'ul',
      { class: 'checklist' },
      ...['Every workout starts with a warm-up', 'Breathe out on the effort – never hold your breath', 'Stop if anything feels sharp or painful'].map((t) =>
        h('li', {}, icon('checkCircle', 26), t),
      ),
    ),
    h('a', { class: 'btn btn-block', href: href({ name: 'safety' }), onclick: go({ name: 'safety' }) }, 'Safety & back care'),
  );

  const demo = createThumb(EXERCISES.goblet);
  players.push(demo.player);
  demo.el.classList.remove('thumb');
  const howTo = h(
    'a',
    { class: 'card howto', href: href({ name: 'library' }), onclick: go({ name: 'library' }) },
    h('div', { class: 'howto-stage' }, demo.el, h('span', { class: 'play-badge', 'aria-hidden': 'true' }, icon('play', 30))),
    h('h2', {}, 'How to do the exercises'),
    h('p', { class: 'meta', style: 'margin:0 4px' }, 'All 31 exercises with slow animated demos.'),
  );

  const el = h(
    'main',
    { class: 'app wide has-tabbar' },
    h(
      'header',
      { class: 'greeting' },
      h('span', { class: 'wave', 'aria-hidden': 'true' }, '💪'),
      h('div', {}, h('p', { class: 'hello' }, greeting()), h('p', {}, 'Ready for your workout?')),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Settings', onclick: () => navigate({ name: 'settings' }) }, icon('gear', 28)),
    ),
    resume,
    hero,
    h('div', { class: 'home-grid' }, h('div', {}, lastTrainedCard(), weekCard()), h('aside', {}, beforeStart, howTo)),
    tabBar('home'),
  );

  return { el, title: "Dad's Home Workout", destroy: () => players.forEach((p) => p.destroy()) };
}
