import type { Player } from '../anim/player';
import { EXERCISES, type ExerciseId, GROUPS, type Location, type MuscleGroup, groupName } from '../data/exercises';
import { unlockAudio } from '../lib/alerts';
import { type Screen, h } from '../lib/dom';
import { FOCUS_INFO, HIGH_LOAD_GAP_HOURS, MAX_EXERCISES, daysBetween, generate, lastHighLoad, lastTrained, swapOptions, whenText } from '../lib/generator';
import { icon } from '../lib/icons';
import { navigate } from '../lib/router';
import { type Focus, type Plan, load, save } from '../lib/storage';
import { topbar } from './chrome';
import { createThumb } from './stage';

/** Groups to preselect (from a "Last trained" tile on Home), or null for a fresh choice. */
let preset: MuscleGroup[] | null = null;
export function presetChoose(groups: MuscleGroup[] | null): void {
  preset = groups;
}

function initialPlan(): Plan {
  const s = load();
  if (preset) {
    const groups = preset;
    preset = null;
    return { location: s.lastLocation, focus: 'custom', groups, exercises: [] };
  }
  return s.draft ?? { location: s.lastLocation, focus: 'full', groups: [], exercises: [] };
}

export function chooseScreen(): Screen {
  let plan = initialPlan();
  let openSwap: number | null = null;
  let players: Player[] = [];

  const regenerate = () => {
    const s = load();
    plan = { ...plan, exercises: generate({ location: plan.location, focus: plan.focus, groups: plan.groups, history: s.history, homeMissing: s.homeMissing }) };
    openSwap = null;
  };
  if (!plan.exercises.length) regenerate();

  const persist = () => {
    if (plan.exercises.length) save({ draft: plan, lastLocation: plan.location });
  };

  /* ---------- step 1: where ---------- */
  const whereCard = h('section', { class: 'card', 'aria-labelledby': 'where-h' });
  const renderWhere = () => {
    const btn = (loc: Location, label: string, ic: 'home' | 'dumbbell') =>
      h(
        'button',
        {
          class: 'btn choice',
          type: 'button',
          'aria-pressed': String(plan.location === loc),
          onclick: () => {
            plan = { ...plan, location: loc };
            regenerate();
            renderAll();
          },
        },
        icon(ic, 28),
        label,
      );
    whereCard.replaceChildren(h('h2', { id: 'where-h' }, '1. Where are you training?'), h('div', { class: 'segmented big' }, btn('home', 'Home', 'home'), btn('gym', 'Gym', 'dumbbell')));
  };

  /* ---------- step 2: focus ---------- */
  const focusCard = h('section', { class: 'card', 'aria-labelledby': 'focus-h' });
  const renderFocus = () => {
    const recency = lastTrained(load().history);
    const options = FOCUS_INFO.map((f) =>
      h(
        'li',
        {},
        h(
          'button',
          {
            class: 'focus-option',
            type: 'button',
            'aria-pressed': String(plan.focus === f.id),
            onclick: () => {
              plan = { ...plan, focus: f.id as Focus, groups: f.id === 'custom' ? plan.groups : [] };
              regenerate();
              renderAll();
            },
          },
          h('span', { class: 'f-name' }, f.name, f.id === 'full' ? h('span', { class: 'rec-pill' }, 'Recommended') : null),
          h('span', { class: 'f-hint' }, f.hint),
        ),
      ),
    );
    const custom =
      plan.focus === 'custom'
        ? h(
            'fieldset',
            { class: 'group-checks' },
            h('legend', {}, 'Tick the muscle groups you want'),
            ...GROUPS.map((g) => {
              const id = `g-${g.id}`;
              const box = h('input', { type: 'checkbox', id, checked: plan.groups.includes(g.id) });
              box.addEventListener('change', () => {
                const groups = box.checked ? [...plan.groups, g.id] : plan.groups.filter((x) => x !== g.id);
                plan = { ...plan, groups };
                regenerate();
                renderPlan();
                persist();
              });
              const days = recency.find((r) => r.group === g.id)?.days ?? null;
              return h('label', { class: 'check', for: id }, box, h('span', {}, g.name), h('small', {}, whenText(days)));
            }),
          )
        : null;
    focusCard.replaceChildren(h('h2', { id: 'focus-h' }, '2. What would you like to work on?'), h('ul', { class: 'focus-list' }, ...options), ...(custom ? [custom] : []));
  };

  /* ---------- step 3: the workout ---------- */
  const planCard = h('section', { class: 'card', 'aria-labelledby': 'plan-h' });
  const startBtn = h('button', { class: 'btn btn-primary btn-big', type: 'button' }, icon('play', 30), 'Start workout');
  startBtn.addEventListener('click', () => {
    if (!plan.exercises.length) return;
    unlockAudio();
    save({
      lastLocation: plan.location,
      draft: plan,
      progress: { plan, phase: 'warmup', index: 0, set: 1, setsDone: plan.exercises.map(() => 0) },
    });
    // Replace this screen, so back from the workout (or "Back to home") lands on Home.
    navigate({ name: 'workout' }, { replace: true });
  });

  const renderPlan = () => {
    players.forEach((p) => p.destroy());
    players = [];
    const s = load();
    const notes: HTMLElement[] = [];
    const last = lastHighLoad(s.history);
    if (last && Date.now() - last.at.getTime() < HIGH_LOAD_GAP_HOURS * 3_600_000) {
      notes.push(
        h(
          'p',
          { class: 'legend' },
          icon('info', 22),
          `No back-heavy exercises today – you did ${EXERCISES[last.id].name} ${whenText(daysBetween(last.at, new Date())).toLowerCase()}. Your back gets 48 hours between them.`,
        ),
      );
    }

    const rows = plan.exercises.map((id, i) => {
      const ex = EXERCISES[id];
      const thumb = createThumb(ex);
      players.push(thumb.player);
      const swapping = openSwap === i;
      const row = h(
        'li',
        { class: 'plan-item' },
        h(
          'div',
          { class: 'plan-main' },
          thumb.el,
          h(
            'div',
            {},
            h('span', { class: 'name' }, ex.name),
            h('span', { class: 'dose' }, `${groupName(ex.group)} · ${ex.sets} × ${ex.dose}`),
            ex.backLoad === 'high' ? h('span', { class: 'flag' }, icon('warning', 16), 'Back-heavy – only one per session') : null,
            ex.flag ? h('span', { class: 'flag' }, icon('warning', 16), 'Ask physio first') : null,
          ),
        ),
        h(
          'div',
          { class: 'plan-actions' },
          h(
            'button',
            {
              class: 'btn',
              type: 'button',
              'aria-expanded': String(swapping),
              onclick: () => {
                openSwap = swapping ? null : i;
                renderPlan();
              },
            },
            icon('swap', 20),
            'Swap',
          ),
          h(
            'button',
            {
              class: 'btn',
              type: 'button',
              disabled: plan.exercises.length <= 1,
              onclick: () => {
                plan = { ...plan, exercises: plan.exercises.filter((_, j) => j !== i) };
                openSwap = null;
                renderPlan();
                persist();
              },
            },
            icon('close', 20),
            'Remove',
          ),
          h('button', { class: 'btn', type: 'button', onclick: () => navigate({ name: 'exercise', id }) }, 'How to'),
        ),
      );
      if (swapping) {
        const opts = swapOptions(plan.exercises, i, plan.location, s.history, s.homeMissing);
        row.append(
          h(
            'div',
            { class: 'swap-list', role: 'group', 'aria-label': `Swap ${ex.name} for` },
            h('p', { class: 'meta', style: 'margin:0 0 8px' }, opts.length ? `Other ${groupName(ex.group).toLowerCase()} exercises:` : `No other ${groupName(ex.group).toLowerCase()} exercises available here.`),
            ...opts.map((o) =>
              h(
                'button',
                {
                  class: `swap-option${o.status.ok ? '' : ' blocked'}`,
                  type: 'button',
                  disabled: !o.status.ok,
                  onclick: () => {
                    plan = { ...plan, exercises: plan.exercises.map((x, j) => (j === i ? (o.ex.id as ExerciseId) : x)) };
                    openSwap = null;
                    renderPlan();
                    persist();
                  },
                },
                h('span', { class: 'name' }, o.ex.name),
                o.status.ok ? h('span', { class: 'dose' }, `${o.ex.sets} × ${o.ex.dose}`) : h('span', { class: 'why' }, o.status.reason),
              ),
            ),
          ),
        );
      }
      return row;
    });

    planCard.replaceChildren(
      ...[
      h('div', { class: 'card-title-row' }, h('h2', { id: 'plan-h' }, `3. Your workout (${plan.exercises.length})`), plan.exercises.length ? h(
        'button',
        {
          class: 'btn',
          type: 'button',
          onclick: () => {
            regenerate();
            renderPlan();
            persist();
          },
        },
        icon('swap', 20),
        'Shuffle',
      ) : null),
      ...notes,
      plan.exercises.length
        ? h('ol', { class: 'plan-list' }, ...rows)
        : h('p', { class: 'meta' }, plan.focus === 'custom' ? 'Tick at least one muscle group above.' : 'Nothing fits here with your equipment – try the other location.'),
      plan.exercises.length ? h('p', { class: 'legend' }, icon('info', 22), `About ${MAX_EXERCISES} exercises at most. Every workout starts with a short warm-up. Exercises marked “ask physio first” are only added if you swap them in.`) : null,
      ].filter((x): x is HTMLElement => x !== null),
    );
    startBtn.disabled = !plan.exercises.length;
  };

  const renderAll = () => {
    renderWhere();
    renderFocus();
    renderPlan();
    persist();
  };
  renderAll();

  const el = h('main', { class: 'app' }, topbar("Choose today's workout"), whereCard, focusCard, planCard, startBtn);
  return { el, title: "Choose today's workout", destroy: () => players.forEach((p) => p.destroy()) };
}
