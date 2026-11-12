import { type Exercise, REST_SECONDS, type WorkoutId } from '../data/exercises';
import { restOver, unlockAudio } from '../lib/alerts';
import { type Screen, h } from '../lib/dom';
import { icon } from '../lib/icons';
import { workoutExercises } from '../lib/plan';
import { back, navigate } from '../lib/router';
import { type Progress, finishWorkout, load, save } from '../lib/storage';
import { keepScreenOn, releaseScreen } from '../lib/wakelock';
import { type Stage, createStage } from './stage';

const RING_R = 96;
const RING_LEN = 2 * Math.PI * RING_R;

/**
 * Workout mode: one exercise at a time → "Set done" → rest timer → next set.
 * Progress is saved after every set, so the back button, a phone call or a
 * closed app never loses the session ("Carry on" on Home).
 */
export function workoutScreen(): Screen {
  const state = load();
  const workout: WorkoutId = state.progress?.workout ?? state.next;
  const list = workoutExercises(workout);
  let pos: Progress = state.progress && state.progress.workout === workout ? state.progress : { workout, index: 0, set: 1 };
  save({ progress: pos });

  let stage: Stage | null = null;
  let timer = 0;

  const body = h('div', {});
  const bar = h('span', {});
  const totalSets = list.reduce((n, e) => n + e.sets, 0);
  const setsDone = () => list.slice(0, pos.index).reduce((n, e) => n + e.sets, 0) + pos.set - 1;
  const updateBar = () => (bar.style.width = `${(100 * setsDone()) / totalSets}%`);

  const notice = h('p', { class: 'notice', hidden: true });
  void keepScreenOn().then((ok) => {
    if (!ok) {
      notice.hidden = false;
      notice.textContent = 'Your screen may switch off by itself. Tap it now and then, or lengthen the screen timeout in your phone settings.';
    }
  });

  const clear = () => {
    window.clearInterval(timer);
    stage?.player.destroy();
    stage = null;
    body.replaceChildren();
  };

  const focusHeading = () => body.querySelector<HTMLElement>('h2')?.focus();

  function showSet(): void {
    clear();
    updateBar();
    const ex = list[pos.index]!;
    stage = createStage(ex);
    body.append(
      h('h2', { tabindex: '-1', style: 'text-align:center' }, ex.name),
      stage.el,
      h('p', { class: 'set-count' }, `Set ${pos.set} of ${ex.sets}`),
      h('p', { class: 'set-dose' }, ex.dose),
      h('button', { class: 'btn btn-primary btn-big', type: 'button', onclick: setDone }, icon('check', 32), 'Set done'),
      h(
        'div',
        { class: 'row', style: 'margin-top:12px' },
        h('button', { class: 'btn', type: 'button', onclick: () => navigate({ name: 'exercise', id: ex.id }) }, 'How to do it'),
        h('button', { class: 'btn', type: 'button', onclick: skipExercise }, 'Skip exercise'),
      ),
    );
    focusHeading();
  }

  function advance(): 'next' | 'done' {
    const ex = list[pos.index]!;
    if (pos.set < ex.sets) pos = { ...pos, set: pos.set + 1 };
    else if (pos.index < list.length - 1) pos = { ...pos, index: pos.index + 1, set: 1 };
    else return 'done';
    save({ progress: pos });
    return 'next';
  }

  function setDone(): void {
    unlockAudio(); // a fresh user gesture keeps audio allowed
    const finished: Exercise = list[pos.index]!;
    if (advance() === 'done') showDone();
    else showRest(REST_SECONDS[finished.kind]);
  }

  function skipExercise(): void {
    if (pos.index >= list.length - 1) return showDone();
    pos = { ...pos, index: pos.index + 1, set: 1 };
    save({ progress: pos });
    showSet();
  }

  function showRest(seconds: number): void {
    clear();
    updateBar();
    const ex = list[pos.index]!;
    const endAt = Date.now() + seconds * 1000;
    const clock = h('p', { class: 'clock', role: 'timer', 'aria-live': 'off' }, String(seconds));
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ring.setAttribute('class', 'ring');
    ring.setAttribute('viewBox', '0 0 220 220');
    ring.setAttribute('aria-hidden', 'true');
    ring.innerHTML = `<circle class="track" cx="110" cy="110" r="${RING_R}" fill="none" stroke-width="16"/>
      <circle class="bar" cx="110" cy="110" r="${RING_R}" fill="none" stroke-width="16" stroke-linecap="round"
        stroke-dasharray="${RING_LEN}" stroke-dashoffset="0" transform="rotate(-90 110 110)"/>`;
    const arc = ring.querySelector<SVGCircleElement>('.bar')!;
    const sr = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });

    const tick = () => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      clock.textContent = String(left);
      arc.setAttribute('stroke-dashoffset', String(RING_LEN * (1 - (endAt - Date.now()) / (seconds * 1000))));
      if (left === 10) sr.textContent = '10 seconds left';
      if (left <= 0) {
        restOver();
        showSet();
      }
    };
    body.append(
      h('h2', { tabindex: '-1', style: 'text-align:center' }, 'Rest'),
      h('div', { class: 'rest' }, h('div', { class: 'ring-wrap' }, ring, clock), h('p', { class: 'next' }, `Next: ${ex.name} – set ${pos.set} of ${ex.sets}`)),
      h('button', { class: 'btn btn-primary btn-big', type: 'button', onclick: showSet }, 'Skip rest'),
      sr,
    );
    timer = window.setInterval(tick, 250);
    tick();
    focusHeading();
  }

  function showDone(): void {
    clear();
    finishWorkout(workout);
    bar.style.width = '100%';
    void releaseScreen();
    body.append(
      h(
        'div',
        { class: 'done-screen' },
        h('p', { class: 'big', 'aria-hidden': 'true' }, icon('checkCircle', 96)),
        h('h2', { tabindex: '-1' }, 'Done – go for a walk later.'),
        h('p', {}, 'Well done. Next time: Workout ' + (workout === 'A' ? 'B' : 'A') + '.'),
        h('button', { class: 'btn btn-primary btn-big', type: 'button', onclick: () => back() }, 'Back to home'),
      ),
    );
    focusHeading();
  }

  const el = h(
    'main',
    { class: 'app' },
    h(
      'header',
      { class: 'topbar' },
      h('button', { class: 'btn back-btn', type: 'button', onclick: () => back(), 'aria-label': 'Leave workout (progress is saved)' }, icon('close', 22), 'Leave'),
      h('h1', {}, `Workout ${workout}`),
    ),
    h('div', { class: 'progress', role: 'presentation' }, bar),
    body,
    notice,
  );

  showSet();
  return {
    el,
    title: `Workout ${workout}`,
    destroy: () => {
      clear();
      void releaseScreen();
    },
  };
}
