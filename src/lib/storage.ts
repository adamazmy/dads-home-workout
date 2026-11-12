/** Everything the app remembers, in localStorage. Every access is guarded: storage can be unavailable. */
import type { WorkoutId } from '../data/exercises';

export interface Progress {
  workout: WorkoutId;
  index: number; // exercise index in the workout
  set: number; // 1-based set about to be done
}

export interface AppState {
  next: WorkoutId;
  /** Local dates (YYYY-MM-DD) a workout was finished, newest last. */
  history: { date: string; workout: WorkoutId }[];
  useStepUps: boolean;
  progress: Progress | null;
  /** Local dates a walk was ticked off. */
  walks: string[];
  theme: Theme;
}

export type Theme = 'auto' | 'light' | 'dark';

const KEY = 'dhw.state.v1';
const DEFAULTS: AppState = { next: 'A', history: [], useStepUps: false, progress: null, walks: [], theme: 'auto' };

export function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      next: parsed.next === 'B' ? 'B' : 'A',
      history: Array.isArray(parsed.history) ? parsed.history.slice(-60) : [],
      useStepUps: parsed.useStepUps === true,
      progress: parsed.progress ?? null,
      walks: Array.isArray(parsed.walks) ? parsed.walks.slice(-120) : [],
      theme: parsed.theme === 'light' || parsed.theme === 'dark' ? parsed.theme : 'auto',
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function save(patch: Partial<AppState>): AppState {
  const next = { ...load(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode or storage full: the app still works for this session */
  }
  return next;
}

export const localDate = (d = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function finishWorkout(workout: WorkoutId): AppState {
  const s = load();
  return save({
    next: workout === 'A' ? 'B' : 'A',
    history: [...s.history, { date: localDate(), workout }],
    progress: null,
  });
}

export function toggleWalk(date = localDate()): AppState {
  const { walks } = load();
  return save({ walks: walks.includes(date) ? walks.filter((d) => d !== date) : [...walks, date] });
}

/** Applies the saved theme to <html> (auto = follow the phone). */
export function applyTheme(theme: Theme = load().theme): void {
  if (theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}
