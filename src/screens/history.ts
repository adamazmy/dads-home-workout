import { EXERCISES } from '../data/exercises';
import { type Screen, h } from '../lib/dom';
import { icon } from '../lib/icons';
import { MAX_IMPORT_BYTES, exportData, importData, load, localDate } from '../lib/storage';
import { describeSets } from '../lib/tracking';
import { cardTitle, tabBar, weekDays } from './chrome';
import { workoutSummary } from './week';

const fmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

const stat = (num: string | number, lbl: string) =>
  h('section', { class: 'card stat' }, h('p', { class: 'num', style: 'margin:0' }, String(num)), h('p', { class: 'lbl', style: 'margin:6px 0 0' }, lbl));

/** Saves the history as a JSON file (Downloads on Android) so it survives a phone change. */
function download(): void {
  const blob = new Blob([exportData()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: `workout-history-${localDate()}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function historyScreen(): Screen {
  const { history, walks } = load();
  const days = weekDays();
  const recent = [...history].reverse().slice(0, 40);
  const status = h('p', { class: 'meta', role: 'status' });

  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'visually-hidden', id: 'import-file' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      status.textContent = 'That file is too big to be a workout history.';
      return;
    }
    const result = importData(await file.text());
    if (!result.ok) {
      status.textContent = result.error;
      return;
    }
    status.textContent = `Imported ${result.added} workout${result.added === 1 ? '' : 's'} and ${result.walksAdded} walk${result.walksAdded === 1 ? '' : 's'}${result.skipped ? ` (${result.skipped} already here or unreadable, left out)` : ''}. Nothing was deleted.`;
    setTimeout(() => dispatchEvent(new Event('app:refresh')), 1800);
  });

  const items = recent.map((log) =>
    h(
      'li',
      { class: 'log' },
      h('div', { class: 'log-head' }, h('b', {}, fmt(log.date)), h('span', { class: 'meta' }, workoutSummary(log))),
      h('ul', { class: 'log-ex' }, ...log.exercises.map((e) => h('li', {}, `${EXERCISES[e.id].name} – ${e.log ? describeSets(e.id, e.log) : `${e.sets} ${e.sets === 1 ? 'set' : 'sets'}`}`))),
    ),
  );

  const el = h(
    'main',
    { class: 'app has-tabbar' },
    h('header', { class: 'topbar' }, h('h1', { tabindex: '-1' }, 'History')),
    h(
      'div',
      { class: 'stats' },
      stat(days.filter((d) => d.workouts.length).length, 'Workout days this week'),
      stat(days.filter((d) => d.walkDone).length, 'Walks this week'),
      stat(history.length, 'Workouts in total'),
      stat(walks.length, 'Walks in total'),
    ),
    h(
      'section',
      { class: 'card', 'aria-labelledby': 'recent-h' },
      cardTitle('flame', 'Your workouts', 'recent-h'),
      items.length ? h('ol', { class: 'logs' }, ...items) : h('p', { class: 'meta', style: 'margin:0' }, 'No workouts yet – your first one will show up here.'),
    ),
    h(
      'section',
      { class: 'card', 'aria-labelledby': 'backup-h' },
      h('h2', { id: 'backup-h' }, 'Keep your history safe'),
      h('p', { class: 'meta' }, 'Your history lives only on this phone. Export a copy now and then – for example before changing phones – and import it on the new one.'),
      h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: download }, 'Export'), h('label', { class: 'btn', for: 'import-file' }, 'Import')),
      fileInput,
      status,
    ),
    h('p', { class: 'legend' }, icon('info', 22), 'Progress slowly: more reps first, then sets, then weight.'),
    tabBar('history'),
  );
  return { el, title: 'History' };
}
