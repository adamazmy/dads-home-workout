import { FigureView } from './render';
import { type ExerciseAnimation, Timeline } from './timeline';

/** One requestAnimationFrame loop drives every visible player. */
const active = new Set<Player>();
let rafId = 0;
let last = 0;
function tick(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  for (const p of active) p.advance(dt);
  rafId = active.size ? requestAnimationFrame(tick) : 0;
}
function schedule(): void {
  if (!rafId && active.size) {
    last = performance.now();
    rafId = requestAnimationFrame(tick);
  }
}

const timelines = new WeakMap<ExerciseAnimation, Timeline>();
export function timelineFor(anim: ExerciseAnimation): Timeline {
  let tl = timelines.get(anim);
  if (!tl) {
    tl = new Timeline(anim);
    timelines.set(anim, tl);
  }
  return tl;
}

export interface PlayerOptions {
  label: string;
  onLabel?: (label: string) => void;
  autoplay?: boolean;
}

export class Player {
  readonly view: FigureView;
  readonly timeline: Timeline;
  private time = 0;
  private playing = false;
  private visible = true;
  private lastLabel = '';
  private observer?: IntersectionObserver;
  speed = 1;

  constructor(anim: ExerciseAnimation, private readonly opts: PlayerOptions) {
    this.timeline = timelineFor(anim);
    this.view = new FigureView(this.timeline, opts.label);
    this.render();
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(([entry]) => {
        this.visible = entry?.isIntersecting ?? true;
        this.sync();
      });
      this.observer.observe(this.view.svg);
    }
    if (opts.autoplay !== false) this.play();
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  play(): void {
    this.playing = true;
    this.sync();
  }

  pause(): void {
    this.playing = false;
    this.sync();
  }

  /** Show keyframe `i` as a still. */
  showKeyframe(i: number): void {
    this.time = this.timeline.frames[i]?.startTime ?? 0;
    this.time += this.timeline.frames[i]?.kf.dur ?? 0;
    this.render();
  }

  advance(dt: number): void {
    this.time += dt * this.speed;
    this.render();
  }

  destroy(): void {
    this.playing = false;
    active.delete(this);
    this.observer?.disconnect();
  }

  private sync(): void {
    if (this.playing && this.visible && this.view.svg.isConnected !== false) active.add(this);
    else active.delete(this);
    schedule();
  }

  private render(): void {
    const s = this.timeline.sample(this.time);
    this.view.update(s.figure);
    if (s.label !== this.lastLabel) {
      this.lastLabel = s.label;
      this.opts.onLabel?.(s.label);
    }
  }
}
