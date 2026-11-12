/** Pieces shared by several screens: back button, tab bar, week model, hero art. */
import { FigureView } from '../anim/render';
import { Timeline } from '../anim/timeline';
import { WORKOUT_DAYS, type WorkoutId } from '../data/exercises';
import { stepUp } from '../data/animations';
import { h } from '../lib/dom';
import { type IconName, icon } from '../lib/icons';
import { TABS, back, goTab } from '../lib/router';
import { load, localDate } from '../lib/storage';

export function backButton(label = 'Back'): HTMLButtonElement {
  return h('button', { class: 'btn back-btn', type: 'button', onclick: () => back() }, icon('chevronLeft', 22), label);
}

export function topbar(title: string, backLabel = 'Back'): HTMLElement {
  return h('header', { class: 'topbar' }, backButton(backLabel), h('h1', { tabindex: '-1' }, title));
}

export function cardTitle(iconName: IconName, text: string, id?: string): HTMLElement {
  return h('div', { class: 'card-title' }, icon(iconName, 30), h('h2', { id }, text));
}

const TAB_INFO: Record<(typeof TABS)[number], { label: string; icon: IconName }> = {
  home: { label: 'Workouts', icon: 'home' },
  week: { label: 'This Week', icon: 'calendar' },
  progress: { label: 'Progress', icon: 'chart' },
};

export function tabBar(active: (typeof TABS)[number]): HTMLElement {
  return h(
    'nav',
    { class: 'tabbar', 'aria-label': 'Main' },
    ...TABS.map((t) =>
      h(
        'button',
        { class: 'tab', type: 'button', 'aria-current': t === active ? 'page' : undefined, onclick: () => goTab(t) },
        icon(TAB_INFO[t].icon, 26),
        TAB_INFO[t].label,
      ),
    ),
  );
}

/* ---------------- Week model ---------------- */

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface DayInfo {
  name: string;
  date: Date;
  iso: string;
  isWorkout: boolean;
  isToday: boolean;
  isPast: boolean;
  workoutDone: WorkoutId | null;
  walkDone: boolean;
  /** For lift days not yet done: the workout planned (alternating from the next one). */
  planned: WorkoutId | null;
}

export function weekDays(today = new Date()): DayInfo[] {
  const state = load();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const todayIso = localDate(today);
  let nextLetter: WorkoutId = state.next;
  return DAY_NAMES.map((name, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const iso = localDate(date);
    const isWorkout = WORKOUT_DAYS.includes(i);
    const done = [...state.history].reverse().find((x) => x.date === iso)?.workout ?? null;
    const isPast = iso < todayIso;
    let planned: WorkoutId | null = null;
    if (isWorkout && !done && !isPast) {
      planned = nextLetter;
      nextLetter = nextLetter === 'A' ? 'B' : 'A';
    }
    return { name, date, iso, isWorkout, isToday: iso === todayIso, isPast, workoutDone: done, walkDone: state.walks.includes(iso), planned };
  });
}

/* ---------------- Hero landscape ---------------- */

const NS = 'http://www.w3.org/2000/svg';

/** Hills, a low sun and a figure stepping up, drawn by the same skeleton engine as the demos. */
export function heroArt(): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'hero-art');
  svg.setAttribute('viewBox', '0 0 400 220');
  svg.setAttribute('preserveAspectRatio', 'xMaxYMin meet');
  svg.setAttribute('aria-hidden', 'true');
  // Hills fade out at the bottom so the art can stop above the buttons on phones.
  svg.innerHTML = `
    <defs>
      <linearGradient id="hero-fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.72" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
      <mask id="hero-mask"><rect width="400" height="220" fill="url(#hero-fade)"/></mask>
    </defs>
    <circle cx="318" cy="70" r="44" fill="#f2c36b" opacity="0.85"/>
    <g mask="url(#hero-mask)">
      <path d="M0 150 C80 112 160 122 230 102 S360 72 400 86 V220 H0Z" fill="#8fb595" opacity="0.35"/>
      <path d="M0 178 C90 142 170 152 250 137 S360 122 400 130 V220 H0Z" fill="#5d8a68" opacity="0.55"/>
      <path d="M170 220 C240 200 290 178 345 170 L400 166 V220Z" fill="#1d3a2d" opacity="0.92"/>
    </g>`;

  const tl = new Timeline(stepUp);
  const view = new FigureView(tl, '');
  view.update(tl.at(2).figure); // whole foot on the step, about to drive up
  const fig = view.svg;
  fig.classList.add('silhouette');
  const [vx, vy, vw, vh] = fig.getAttribute('viewBox')!.split(' ').map(Number) as [number, number, number, number];
  const s = 0.7; // cm → art units
  const groundX = 336;
  const groundY = 172;
  fig.setAttribute('x', String(groundX + vx * s));
  fig.setAttribute('y', String(groundY + vy * s));
  fig.setAttribute('width', String(vw * s));
  fig.setAttribute('height', String(vh * s));
  fig.removeAttribute('role');
  svg.append(fig);
  return svg;
}
