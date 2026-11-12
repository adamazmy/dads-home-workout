import { EXERCISES, type ExerciseId, REST_SECONDS } from '../data/exercises';
import { type Screen, h } from '../lib/dom';
import { back } from '../lib/router';
import { load, save } from '../lib/storage';
import { createStage } from './stage';

export function backButton(label = '‹ Back'): HTMLButtonElement {
  return h('button', { class: 'btn back-btn', type: 'button', onclick: () => back() }, label);
}

function flagCard(id: ExerciseId): HTMLElement | null {
  const ex = EXERCISES[id];
  if (!ex.flag) return null;
  const alt = ex.flag.alternative ? EXERCISES[ex.flag.alternative] : null;
  const using = load().useStepUps;
  const status = h('p', { 'aria-live': 'polite' }, using ? `Your plan uses ${alt?.name.toLowerCase()} instead.` : 'Your plan includes this exercise.');
  const toggle = h('button', { class: 'btn btn-block', type: 'button' });
  const sync = () => {
    const now = load().useStepUps;
    toggle.textContent = now ? `Physio said OK – use ${ex.name.toLowerCase()}` : `Use ${alt?.name.toLowerCase()} instead`;
    status.textContent = now ? `Your plan uses ${alt?.name.toLowerCase()} instead.` : 'Your plan includes this exercise.';
  };
  toggle.addEventListener('click', () => {
    save({ useStepUps: !load().useStepUps });
    sync();
  });
  sync();
  return h('section', { class: 'warn', role: 'note' }, h('h2', {}, `⚠ ${ex.flag.text}`), alt ? status : null, alt ? toggle : null);
}

export function detailScreen(id: string): Screen | null {
  if (!(id in EXERCISES)) return null;
  const ex = EXERCISES[id as ExerciseId];
  const stage = createStage(ex);

  const el = h(
    'main',
    { class: 'app' },
    h('header', { class: 'topbar' }, backButton(), h('h1', { tabindex: '-1' }, ex.name)),
    flagCard(ex.id),
    stage.el,
    h(
      'section',
      { class: 'card' },
      h('p', { class: 'dose-big' }, `${ex.sets} sets × ${ex.dose}`),
      h('p', { class: 'meta', style: 'margin:0' }, `Rest ${REST_SECONDS[ex.kind]} seconds between sets.`),
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
    backButton('‹ Back'),
  );
  el.lastElementChild!.classList.add('btn-block');
  return { el, title: ex.name, destroy: () => stage.player.destroy() };
}
