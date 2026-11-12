import { EQUIPMENT, EXERCISES, type ExerciseId, groupName, isExerciseId } from '../data/exercises';
import { type Screen, h } from '../lib/dom';
import { icon } from '../lib/icons';
import { load } from '../lib/storage';
import { describeSets } from '../lib/tracking';
import { backButton, topbar } from './chrome';
import { createStage } from './stage';

function flagCard(id: ExerciseId): HTMLElement | null {
  const ex = EXERCISES[id];
  if (!ex.flag) return null;
  return h(
    'section',
    { class: 'warn', role: 'note' },
    h('h2', {}, icon('warning', 26), ex.flag.text),
    h('p', { style: 'margin:0' }, 'It is never added to a workout automatically – only if you swap it in yourself, once your physio says it is OK.'),
  );
}

const BACK_LOAD_TEXT = {
  low: 'Gentle on the back',
  moderate: 'Some load on the back – keep it flat',
  high: 'Back-heavy – one per session, 48 h apart',
} as const;

function tags(ex: (typeof EXERCISES)[ExerciseId]): HTMLElement {
  const where = ex.where === 'both' ? 'Home or gym' : ex.where === 'home' ? 'Home' : 'Gym';
  return h(
    'ul',
    { class: 'tags', 'aria-label': 'About this exercise' },
    h('li', {}, groupName(ex.group)),
    h('li', {}, where),
    ...ex.equipment.map((e) => h('li', {}, EQUIPMENT[e].name)),
    h('li', { class: `load-${ex.backLoad}` }, BACK_LOAD_TEXT[ex.backLoad]),
  );
}

function recentCard(id: ExerciseId): HTMLElement | null {
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const rows = load()
    .history.flatMap((log) => log.exercises.filter((e) => e.id === id && e.log?.length).map((e) => ({ at: log.at, text: describeSets(id, e.log!) })))
    .slice(-3)
    .reverse();
  if (!rows.length) return null;
  return h(
    'section',
    { class: 'card', 'aria-labelledby': 'recent-sets-h' },
    h('h2', { id: 'recent-sets-h' }, 'Your recent sets'),
    h('ul', { class: 'recent' }, ...rows.map((r) => h('li', {}, h('span', {}, fmt(r.at)), h('b', {}, r.text)))),
  );
}

export function detailScreen(id: string): Screen | null {
  if (!isExerciseId(id)) return null; // own-property check: no prototype keys from the URL
  const ex = EXERCISES[id];
  const stage = createStage(ex);

  const el = h(
    'main',
    { class: 'app' },
    topbar(ex.name),
    flagCard(ex.id),
    tags(ex),
    stage.el,
    recentCard(ex.id),
    h(
      'section',
      { class: 'card' },
      h('p', { class: 'dose-big' }, `${ex.sets} sets × ${ex.dose}`),
      h('p', { class: 'meta', style: 'margin:0' }, `Rest ${ex.rest} seconds between sets.`),
    ),
    h('section', { class: 'card', 'aria-labelledby': 'setup-h' }, h('h2', { id: 'setup-h' }, 'Setup'), h('p', { style: 'margin:0' }, ex.setup)),
    h(
      'section',
      { class: 'card', 'aria-labelledby': 'steps-h' },
      h('h2', { id: 'steps-h' }, 'Steps'),
      h('ol', { class: 'steps' }, ...ex.steps.map((s) => h('li', {}, s))),
    ),
    h(
      'section',
      { class: 'card watch-card', 'aria-labelledby': 'watch-h' },
      h('h2', { id: 'watch-h' }, 'Watch out for – protect your back'),
      h('ul', { class: 'watch' }, ...ex.watchOut.map((s) => h('li', {}, s))),
    ),
    h(
      'section',
      { class: 'card easier-card', 'aria-labelledby': 'easy-h' },
      h('h2', { id: 'easy-h' }, 'Easier option'),
      h('p', { style: 'margin:0' }, ex.easier),
    ),
    backButton('Back'),
  );
  el.lastElementChild!.classList.add('btn-block');
  return { el, title: ex.name, destroy: () => stage.player.destroy() };
}
