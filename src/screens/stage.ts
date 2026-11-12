import { Player } from '../anim/player';
import type { Exercise } from '../data/exercises';
import { h, reducedMotion } from '../lib/dom';
import { icon } from '../lib/icons';

export interface Stage {
  el: HTMLElement;
  player: Player;
}

/** Large animation with a phase label, play/pause and normal/half speed. */
export function createStage(ex: Exercise, opts: { compact?: boolean } = {}): Stage {
  const phase = h('p', { class: 'phase', 'aria-live': 'off' });
  const player = new Player(ex.anim, {
    label: `Animation: ${ex.name}`,
    onLabel: (l) => (phase.textContent = l),
    autoplay: true,
  });

  const playBtn = h('button', { class: 'btn', type: 'button' });
  const syncPlay = () => {
    playBtn.replaceChildren(icon(player.isPlaying ? 'pause' : 'play', 20), player.isPlaying ? 'Pause' : 'Play');
    playBtn.setAttribute('aria-label', player.isPlaying ? 'Pause animation' : 'Play animation');
  };
  playBtn.addEventListener('click', () => {
    if (player.isPlaying) player.pause();
    else player.play();
    syncPlay();
  });
  syncPlay();

  const normal = h('button', { class: 'btn', type: 'button', 'aria-pressed': 'true' }, 'Normal');
  const half = h('button', { class: 'btn', type: 'button', 'aria-pressed': 'false' }, '½ speed');
  const setSpeed = (s: number) => {
    player.speed = s;
    normal.setAttribute('aria-pressed', String(s === 1));
    half.setAttribute('aria-pressed', String(s !== 1));
  };
  normal.addEventListener('click', () => setSpeed(1));
  half.addEventListener('click', () => setSpeed(0.5));
  // People who ask for reduced motion get the slower demo by default.
  if (reducedMotion()) setSpeed(0.5);

  const el = h(
    'section',
    { class: 'stage', 'aria-label': 'How it moves' },
    player.view.svg,
    phase,
    opts.compact ? null : h('div', { class: 'controls', role: 'group', 'aria-label': 'Animation controls' }, playBtn, normal, half),
  );
  if (opts.compact) el.classList.add('compact');
  return { el, player };
}

/** Small looping thumbnail for lists (still image with reduced motion). */
export function createThumb(ex: Exercise): { el: HTMLElement; player: Player } {
  const still = reducedMotion();
  const player = new Player(ex.anim, { label: '', autoplay: !still });
  if (still) player.showKeyframe(Math.min(1, ex.anim.keyframes.length - 1));
  player.view.svg.setAttribute('aria-hidden', 'true');
  return { el: h('span', { class: 'thumb' }, player.view.svg), player };
}
