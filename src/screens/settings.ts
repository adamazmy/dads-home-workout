import { EQUIPMENT, type Equipment } from '../data/exercises';
import { type Screen, h } from '../lib/dom';
import { type Theme, applyTheme, load, save, setRememberActivity } from '../lib/storage';
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
  const privacyStatus = h('p', { class: 'meta', role: 'status' });
  const el = h(
    'main',
    { class: 'app' },
    topbar('Settings'),
    h(
      'section',
      { class: 'card', 'aria-labelledby': 'equip-h' },
      h('h2', { id: 'equip-h' }, 'Equipment at home'),
      h('p', { class: 'meta' }, 'Home workouts only use what is ticked. A chair, a mat and the bottom stair are always assumed.'),
      h(
        'fieldset',
        { class: 'group-checks' },
        h('legend', { class: 'visually-hidden' }, 'Equipment at home'),
        ...(Object.keys(EQUIPMENT) as Equipment[])
          .filter((e) => EQUIPMENT[e].optional)
          .map((e) => {
            const id = `eq-${e}`;
            const box = h('input', { type: 'checkbox', id, checked: !s.homeMissing.includes(e) });
            box.addEventListener('change', () => {
              const missing = load().homeMissing.filter((x) => x !== e);
              save({ homeMissing: box.checked ? missing : [...missing, e], draft: null });
            });
            return h('label', { class: 'check', for: id }, box, h('span', {}, EQUIPMENT[e].name));
          }),
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
      { class: 'card', 'aria-labelledby': 'privacy-h' },
      h('h2', { id: 'privacy-h' }, 'Activity privacy'),
      h('p', { class: 'meta' }, 'Activity stays in this browser and is not sent to a server. Anyone using this browser profile can see saved activity. Other sites on the same origin may also access it.'),
      h('p', { class: 'meta' }, 'Session only removes saved activity and your equipment and location choices from this browser. Your current workout continues, but activity is lost when this page closes or reloads. Appearance is still remembered.'),
      segmented<'remember' | 'session'>('Activity storage', [['remember', 'Remember activity'], ['session', 'Session only']], s.rememberActivity ? 'remember' : 'session', (v) => {
        privacyStatus.textContent = setRememberActivity(v === 'remember') ? '' : 'Your browser could not save this choice. Clear site data in your browser settings to remove previously saved activity.';
      }),
      privacyStatus,
      h('p', { class: 'meta' }, 'Clear history below removes workout and walk records. To remove all preferences, use your browser’s clear site data control. If the browser blocks storage changes, use that control to remove previously saved data.'),
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
              save({ history: [], walks: [], progress: null, draft: null });
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
