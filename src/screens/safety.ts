import { type Screen, h } from '../lib/dom';
import { backButton, topbar } from './chrome';

const li = (...items: (string | Node)[]) => items.map((i) => h('li', {}, i));

export function safetyScreen(): Screen {
  const el = h(
    'main',
    { class: 'app safety' },
    topbar('Safety & back care'),
    h(
      'section',
      { class: 'warn', role: 'note' },
      h('h2', {}, 'Show this plan to your physio first'),
      h('p', { style: 'margin:0' }, 'Run the whole plan past your physiotherapist before you start, and again if anything changes with your back.'),
    ),
    h(
      'section',
      { class: 'card stop-card' },
      h('h2', {}, 'When to stop'),
      h('p', {}, 'Muscles working hard and feeling tired is fine. Stop and tell your physio if you get:'),
      h('ul', {}, ...li('Sharp or stabbing pain.', 'Pain, tingling or numbness going down a leg.', 'A back that is worse the next morning.')),
    ),
    h(
      'section',
      { class: 'card' },
      h('h2', {}, 'Warm up first – 5 to 10 minutes'),
      h('ul', {}, ...li('March on the spot or walk around the house.', 'Gentle arm circles and shoulder rolls.', 'A few sit-to-stands from a chair without weights.')),
    ),
    h(
      'section',
      { class: 'card' },
      h('h2', {}, 'How hard?'),
      h('ul', {}, ...li('Stop each set 2–3 reps before you could not do another.', 'Slow and controlled beats heavy and fast.')),
    ),
    h(
      'section',
      { class: 'card' },
      h('h2', {}, 'Breathing'),
      h('ul', {}, ...li('Breathe out on the effort (lifting, pushing, standing up).', 'Never hold your breath.')),
    ),
    h(
      'section',
      { class: 'card' },
      h('h2', {}, 'How to progress'),
      h('ol', { class: 'steps' }, ...li('First add reps, up to the top of the range.', 'Then add a set (up to 3).', 'Only then add weight.')),
      h('p', { style: 'margin:0' }, 'Change one thing at a time, and only when the last session felt comfortable.'),
    ),
    h(
      'section',
      { class: 'card' },
      h('h2', {}, 'Avoid these'),
      h('ul', {}, ...li('Sit-ups and crunches.', 'Russian twists.', 'Bent-over rows without a hand supported.', 'Any twisting while holding a weight.')),
    ),
    backButton('Back to home'),
  );
  el.lastElementChild!.classList.add('btn-block');
  return { el, title: 'Safety & back care' };
}
