import type { Player } from '../anim/player';
import { EXERCISE_LIST, GROUPS, type Location } from '../data/exercises';
import { type Screen, h } from '../lib/dom';
import { isAvailable } from '../lib/generator';
import { icon } from '../lib/icons';
import { href, navigate } from '../lib/router';
import { load } from '../lib/storage';
import { topbar } from './chrome';
import { createThumb } from './stage';

/** Every exercise, grouped by muscle group, filterable by Home / Gym. */
export function libraryScreen(): Screen {
  let where: Location | 'all' = 'all';
  let players: Player[] = [];
  const list = h('div', {});

  const render = () => {
    players.forEach((p) => p.destroy());
    players = [];
    const { homeMissing } = load();
    list.replaceChildren(
      ...GROUPS.map((g) => {
        const exs = EXERCISE_LIST.filter((ex) => ex.group === g.id && (where === 'all' || isAvailable(ex, where, homeMissing)));
        return h(
          'section',
          { 'aria-labelledby': `lib-${g.id}` },
          h('h2', { id: `lib-${g.id}`, class: 'section-title' }, `${g.name} (${exs.length})`),
          h(
            'ul',
            { class: 'ex-list' },
            ...exs.map((ex) => {
              const thumb = createThumb(ex);
              players.push(thumb.player);
              return h(
                'li',
                {},
                h(
                  'a',
                  {
                    class: 'ex-item',
                    href: href({ name: 'exercise', id: ex.id }),
                    onclick: (e: Event) => {
                      e.preventDefault();
                      navigate({ name: 'exercise', id: ex.id });
                    },
                  },
                  thumb.el,
                  h(
                    'span',
                    {},
                    h('span', { class: 'name' }, ex.name),
                    h('span', { class: 'dose' }, `${ex.where === 'both' ? 'Home or gym' : ex.where === 'gym' ? 'Gym' : 'Home'} · ${ex.sets} × ${ex.dose}`),
                    ex.backLoad === 'high' ? h('span', { class: 'flag' }, icon('warning', 16), 'Back-heavy') : null,
                  ),
                  h('span', { class: 'chev' }, icon('chevronRight', 26)),
                ),
              );
            }),
          ),
        );
      }),
    );
  };

  const filter = h('div', { class: 'segmented', role: 'group', 'aria-label': 'Show exercises for' });
  const opts: [Location | 'all', string][] = [['all', 'All'], ['home', 'Home'], ['gym', 'Gym']];
  const buttons = opts.map(([v, label]) => {
    const b = h('button', { class: 'btn', type: 'button', 'aria-pressed': String(v === where) }, label);
    b.addEventListener('click', () => {
      where = v;
      buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      render();
    });
    return b;
  });
  filter.append(...buttons);
  render();

  const el = h('main', { class: 'app' }, topbar('All exercises'), h('div', { class: 'card' }, filter), list);
  return { el, title: 'All exercises', destroy: () => players.forEach((p) => p.destroy()) };
}
