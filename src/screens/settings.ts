import { type Screen, h } from '../lib/dom';
import { type Theme, applyTheme, load, save } from '../lib/storage';
import { topbar } from './chrome';

function segmented<T extends string>(label: string, options: [T, string][], current: T, onPick: (v: T) => void): HTMLElement {
  const group = h('div', { class: 'segmented', role: 'group', 'aria-label': label });
  const buttons = options.map(([value, text]) => {
    const b = h('button', { class: 'btn', type: 'button', 'aria-pressed': String(value === current) }, text);
    b.addEventListener('click', () => {
      buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      onPick(value);
    });
    return b;
  });
  group.append(...buttons);
  return group;
}

export function settingsScreen(): Screen {
  const s = load();
  const el = h(
    'main',
    { class: 'app' },
    topbar('Settings'),
    h(
      'section',
      { class: 'card', 'aria-labelledby': 'rdl-h' },
      h('h2', { id: 'rdl-h' }, 'Workout B, exercise 2'),
      h('p', { class: 'meta' }, 'Keep the Romanian deadlift only if your physio has said it is OK.'),
      segmented<'rdl' | 'stepUp'>('Workout B exercise 2', [['rdl', 'Romanian deadlift'], ['stepUp', 'Step-ups']], s.useStepUps ? 'stepUp' : 'rdl', (v) =>
        save({ useStepUps: v === 'stepUp' }),
      ),
    ),
    h(
      'section',
      { class: 'card', 'aria-labelledby': 'theme-h' },
      h('h2', { id: 'theme-h' }, 'Appearance'),
      segmented<Theme>('Appearance', [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']], s.theme, (v) => {
        save({ theme: v });
        applyTheme(v);
      }),
    ),
    h(
      'section',
      { class: 'card', 'aria-labelledby': 'reset-h' },
      h('h2', { id: 'reset-h' }, 'Start afresh'),
      h('p', { class: 'meta' }, 'Clears the workout and walk history on this phone.'),
      h(
        'button',
        {
          class: 'btn btn-danger btn-block',
          type: 'button',
          onclick: () => {
            if (confirm('Clear all workout and walk history?')) {
              save({ history: [], walks: [], progress: null, next: 'A' });
              dispatchEvent(new Event('app:refresh'));
            }
          },
        },
        'Clear history',
      ),
    ),
  );
  return { el, title: 'Settings' };
}
