import { EXERCISES, groupName } from '../data/exercises';
import { restOver, unlockAudio } from '../lib/alerts';
import { type Screen, h } from '../lib/dom';
import { icon } from '../lib/icons';
import { back, navigate } from '../lib/router';
import { type Progress, finishWorkout, load, save } from '../lib/storage';
import { keepScreenOn, releaseScreen } from '../lib/wakelock';
import { type Stage, createStage } from './stage';

const RING_R = 96;
const RING_LEN = 2 * Math.PI * RING_R;
const WARMUP_SECONDS = 5 * 60;

const WARMUP: [string, string][] = [
  ['March on the spot or walk around the house', '2 minutes'],
  ['Shoulder rolls and arm circles, forwards and back', '1 minute'],
  ['Sit-to-stand from a chair or the bench, no weights', '10 slow reps'],
  ['Hip hinge: hands on hips, push your hips back with a flat back', '10 reps'],
  ['Gentle calf raises, holding on to something', '10 reps'],
];

function ring(): { svg: SVGSVGElement; set: (fraction: number) => void } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ring');
  svg.setAttribute('viewBox', '0 0 220 220');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<circle class="track" cx="110" cy="110" r="${RING_R}" fill="none" stroke-width="16"/>
    <circle class="bar" cx="110" cy="110" r="${RING_R}" fill="none" stroke-width="16" stroke-linecap="round"
      stroke-dasharray="${RING_LEN}" stroke-dashoffset="0" transform="rotate(-90 110 110)"/>`;
  const arc = svg.querySelector<SVGCircleElement>('.bar')!;
  return { svg, set: (f) => arc.setAttribute('stroke-dashoffset', String(RING_LEN * Math.min(1, Math.max(0, f)))) };
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * Workout mode: warm-up → one exercise at a time → "Set done" → rest timer → next set.
 * Progress (including sets done) is saved after every set, so the back button, a phone
 * call or a closed app never loses the session ("Carry on" on Home).
 */
export function workoutScreen(): Screen {
  const saved = load().progress;
  if (!saved) {
    const el = h(
      'main',
      { class: 'app' },
      h('h1', { tabindex: '-1' }, 'No workout chosen'),
      h('p', {}, 'Pick today’s workout first.'),
      h('button', { class: 'btn btn-primary btn-big', type: 'button', onclick: () => navigate({ name: 'choose' }, { replace: true }) }, "Choose today's workout"),
    );
    return { el, title: 'Workout' };
  }
  let pos: Progress = saved;
  const list = pos.plan.exercises.map((id) => EXERCISES[id]);

  let stage: Stage | null = null;
  let timer = 0;

  const body = h('div', {});
  const bar = h('span', {});
  const totalSets = list.reduce((n, e) => n + e.sets, 0);
  const updateBar = () => {
    const done = pos.phase === 'warmup' ? 0 : list.slice(0, pos.index).reduce((n, e) => n + e.sets, 0) + pos.set - 1;
    bar.style.width = `${(100 * done) / totalSets}%`;
  };
  const persist = () => save({ progress: pos });

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

  function showWarmup(): void {
    clear();
    updateBar();
    const clock = h('p', { class: 'clock', role: 'timer', 'aria-live': 'off' }, mmss(WARMUP_SECONDS));
    const r = ring();
    const timerBtn = h('button', { class: 'btn btn-block', type: 'button' }, icon('clock', 22), 'Start a 5-minute timer');
    timerBtn.addEventListener('click', () => {
      unlockAudio();
      timerBtn.disabled = true;
      const endAt = Date.now() + WARMUP_SECONDS * 1000;
      const tick = () => {
        const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
        clock.textContent = mmss(left);
        r.set(1 - (endAt - Date.now()) / (WARMUP_SECONDS * 1000));
        if (left <= 0) {
          window.clearInterval(timer);
          restOver();
          timerBtn.textContent = 'Warm-up time is up';
        }
      };
      timer = window.setInterval(tick, 250);
      tick();
    });
    body.append(
      h('h2', { tabindex: '-1' }, 'Warm up first – 5 to 10 minutes'),
      h('p', { class: 'meta' }, 'Warm muscles and joints are much kinder to your back. Easy pace, nothing should hurt.'),
      h('ol', { class: 'warmup card' }, ...WARMUP.map(([what, dose]) => h('li', {}, h('span', {}, what), h('b', {}, dose)))),
      h('div', { class: 'rest' }, h('div', { class: 'ring-wrap' }, r.svg, clock)),
      timerBtn,
      h(
        'button',
        {
          class: 'btn btn-primary btn-big',
          type: 'button',
          style: 'margin-top:12px',
          onclick: () => {
            unlockAudio();
            pos = { ...pos, phase: 'sets', index: 0, set: 1 };
            persist();
            showSet();
          },
        },
        icon('check', 30),
        "I'm warmed up – start",
      ),
    );
    focusHeading();
  }

  function showSet(): void {
    clear();
    updateBar();
    const ex = list[pos.index]!;
    stage = createStage(ex);
    body.append(
      h('p', { class: 'kicker', style: 'text-align:center;margin:0' }, `Exercise ${pos.index + 1} of ${list.length} · ${groupName(ex.group)}`),
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
      h(
        'p',
        { style: 'text-align:center;margin-top:8px' },
        h(
          'button',
          {
            class: 'link-btn',
            type: 'button',
            onclick: () => {
              if (confirm('Finish now and save the sets you have done?')) showDone();
            },
          },
          'Finish now',
        ),
      ),
    );
    focusHeading();
  }

  function setDone(): void {
    unlockAudio(); // a fresh user gesture keeps audio allowed
    const ex = list[pos.index]!;
    const setsDone = pos.setsDone.map((n, i) => (i === pos.index ? n + 1 : n));
    if (pos.set < ex.sets) pos = { ...pos, set: pos.set + 1, setsDone };
    else if (pos.index < list.length - 1) pos = { ...pos, index: pos.index + 1, set: 1, setsDone };
    else {
      pos = { ...pos, setsDone };
      return showDone();
    }
    persist();
    showRest(ex.rest);
  }

  function skipExercise(): void {
    if (pos.index >= list.length - 1) return showDone();
    pos = { ...pos, index: pos.index + 1, set: 1 };
    persist();
    showSet();
  }

  function showRest(seconds: number): void {
    clear();
    updateBar();
    const ex = list[pos.index]!;
    const endAt = Date.now() + seconds * 1000;
    const clock = h('p', { class: 'clock', role: 'timer', 'aria-live': 'off' }, String(seconds));
    const r = ring();
    const sr = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });
    const tick = () => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      clock.textContent = String(left);
      r.set(1 - (endAt - Date.now()) / (seconds * 1000));
      if (left === 10) sr.textContent = '10 seconds left';
      if (left <= 0) {
        restOver();
        showSet();
      }
    };
    body.append(
      h('h2', { tabindex: '-1', style: 'text-align:center' }, 'Rest'),
      h('div', { class: 'rest' }, h('div', { class: 'ring-wrap' }, r.svg, clock), h('p', { class: 'next' }, `Next: ${ex.name} – set ${pos.set} of ${ex.sets}`)),
      h('button', { class: 'btn btn-primary btn-big', type: 'button', onclick: showSet }, 'Skip rest'),
      sr,
    );
    timer = window.setInterval(tick, 250);
    tick();
    focusHeading();
  }

  function showDone(): void {
    clear();
    const log = finishWorkout(pos);
    bar.style.width = '100%';
    void releaseScreen();
    const sets = log?.exercises.reduce((n, e) => n + e.sets, 0) ?? 0;
    const groups = [...new Set(log?.exercises.map((e) => groupName(EXERCISES[e.id].group)) ?? [])];
    body.append(
      h(
        'div',
        { class: 'done-screen' },
        h('p', { class: 'big', 'aria-hidden': 'true' }, icon('checkCircle', 96)),
        h('h2', { tabindex: '-1' }, 'Done – go for a walk later.'),
        log
          ? h('p', {}, `${log.exercises.length} exercises, ${sets} sets. Worked: ${groups.join(', ')}.`)
          : h('p', {}, 'No sets were done, so nothing was saved.'),
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
      h('h1', {}, pos.plan.location === 'gym' ? 'Gym workout' : 'Home workout'),
    ),
    h('div', { class: 'progress', role: 'presentation' }, bar),
    body,
    notice,
  );

  if (pos.phase === 'warmup') showWarmup();
  else showSet();
  return {
    el,
    title: 'Workout',
    destroy: () => {
      clear();
      void releaseScreen();
    },
  };
}
