/**
 * Everything the app remembers, in localStorage. Every access is guarded: storage can be unavailable.
 *
 * Stored JSON is never trusted: `validate` salvages each valid field independently and
 * drops the rest, so a corrupted or hand-edited record can never crash the app. The same
 * validators check imported history files.
 *
 * Privacy: with "Session only" (rememberActivity = false) nothing but the theme is
 * persisted; activity is kept in memory for the current page only.
 */
import {
  type Equipment,
  EQUIPMENT,
  type ExerciseId,
  type Location,
  type MuscleGroup,
  EXERCISES,
  GROUPS,
  isExerciseId,
} from '../data/exercises';

export type Theme = 'auto' | 'light' | 'dark';
export type Focus = 'full' | 'upper' | 'lower' | 'core' | 'custom';

/** A workout chosen for today, before or while doing it. */
export interface Plan {
  location: Location;
  focus: Focus;
  /** Groups ticked for a custom focus. */
  groups: MuscleGroup[];
  exercises: ExerciseId[];
}

export interface Progress {
  plan: Plan;
  phase: 'warmup' | 'sets';
  index: number; // exercise index in plan.exercises
  set: number; // 1-based set about to be done
  /** Sets completed per exercise (parallel to plan.exercises). */
  setsDone: number[];
}

export interface WorkoutLog {
  id: string;
  /** Local date (YYYY-MM-DD). */
  date: string;
  /** Finish time, ISO 8601 (used for the 48 h rule); falls back to midday of `date`. */
  at: string;
  location: Location;
  focus: Focus;
  exercises: { id: ExerciseId; sets: number }[];
}

export interface AppState {
  history: WorkoutLog[];
  /** Local dates a walk was ticked off. */
  walks: string[];
  progress: Progress | null;
  /** The plan being put together on the "Choose workout" screen. */
  draft: Plan | null;
  lastLocation: Location;
  /** Optional home equipment that is switched off. */
  homeMissing: Equipment[];
  theme: Theme;
  /** Keep activity on this browser between visits. Legacy installs keep their data. */
  rememberActivity: boolean;
}

/** Capacity: ~13 years at 3 workouts a week. Imports never push existing records out (see importData). */
export const MAX_HISTORY = 2000;
export const MAX_WALKS = 5000;
const KEY = 'dhw.state.v1';
const FOCUSES: Focus[] = ['full', 'upper', 'lower', 'core', 'custom'];
const GROUP_IDS = GROUPS.map((g) => g.id);
/** Exercises of the old fixed A/B plan, for migrating old history. */
const LEGACY: Record<'A' | 'B', ExerciseId[]> = {
  A: ['goblet', 'floorPress', 'row', 'bridge', 'deadBug', 'carry'],
  B: ['splitSquat', 'rdl', 'shoulderPress', 'row', 'birdDog', 'sidePlank'],
};

const defaults = (): AppState => ({
  history: [],
  walks: [],
  progress: null,
  draft: null,
  lastLocation: 'home',
  homeMissing: [],
  theme: 'auto',
  rememberActivity: true,
});
let session: AppState | null = null;
let lastWriteSucceeded = true;

/* ---------------- validators (also used for imports) ---------------- */

const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const int = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const isLocation = (v: unknown): v is Location => v === 'home' || v === 'gym';
const isFocus = (v: unknown): v is Focus => FOCUSES.includes(v as Focus);
const isGroup = (v: unknown): v is MuscleGroup => GROUP_IDS.includes(v as MuscleGroup);
export const validDate = (v: unknown): v is string => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const time = Date.parse(`${v}T12:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === v;
};
const validInstant = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= 40 && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));

function validPlan(v: unknown): Plan | null {
  if (!record(v) || !isLocation(v.location) || !isFocus(v.focus) || !Array.isArray(v.exercises)) return null;
  // Reject rather than repair: dropping a bad id would shift every index after it.
  if (!v.exercises.every(isExerciseId)) return null;
  const exercises: ExerciseId[] = [...v.exercises];
  if (exercises.length < 1 || exercises.length > 8 || new Set(exercises).size !== exercises.length) return null;
  const groups = Array.isArray(v.groups) ? [...new Set(v.groups.filter(isGroup))] : [];
  return { location: v.location, focus: v.focus, groups, exercises };
}

/**
 * An unfinished workout saved by the old fixed A/B version: same exercises (RDL -> step-ups if
 * that was chosen), same exercise and set. Only sets that are certain are counted: the sets
 * already done of the current exercise (earlier ones may have been skipped).
 */
function legacyProgress(v: Record<string, unknown>, useStepUps: boolean): Progress | null {
  if ((v.workout !== 'A' && v.workout !== 'B') || !int(v.index, 0, 5)) return null;
  const exercises = LEGACY[v.workout].map((id): ExerciseId => (useStepUps && id === 'rdl' ? 'stepUp' : id));
  const ex = EXERCISES[exercises[v.index]!];
  if (!int(v.set, 1, ex.sets)) return null;
  const set = v.set;
  const index = v.index;
  const setsDone = exercises.map((_, i) => (i === index ? set - 1 : 0));
  return { plan: { location: 'home', focus: 'full', groups: [], exercises }, phase: 'sets', index, set, setsDone };
}

function validProgress(v: unknown, useStepUps = false): Progress | null {
  if (!record(v)) return null;
  if ('workout' in v) return legacyProgress(v, useStepUps);
  const plan = validPlan(v.plan);
  if (!plan || (v.phase !== 'warmup' && v.phase !== 'sets')) return null;
  if (!int(v.index, 0, plan.exercises.length - 1)) return null;
  const ex = EXERCISES[plan.exercises[v.index]!];
  if (!int(v.set, 1, ex.sets)) return null;
  const done =
    Array.isArray(v.setsDone) && v.setsDone.length === plan.exercises.length && v.setsDone.every((n) => int(n, 0, 10))
      ? (v.setsDone as number[])
      : plan.exercises.map(() => 0);
  return { plan, phase: v.phase, index: v.index, set: v.set, setsDone: [...done] };
}

/** One history entry; accepts the current shape and the old `{ date, workout: 'A' | 'B' }`. */
export function validLog(v: unknown, i = 0): WorkoutLog | null {
  if (!record(v) || !validDate(v.date)) return null;
  if (v.workout === 'A' || v.workout === 'B') {
    return {
      id: `legacy-${v.date}-${v.workout}-${i}`,
      date: v.date,
      at: `${v.date}T12:00:00.000Z`,
      location: 'home',
      focus: 'full',
      exercises: LEGACY[v.workout].map((id) => ({ id, sets: 3 })),
    };
  }
  if (typeof v.id !== 'string' || !/^[\w-]{1,60}$/.test(v.id) || !isLocation(v.location) || !isFocus(v.focus) || !Array.isArray(v.exercises)) {
    return null;
  }
  const exercises = v.exercises
    .filter((e): e is { id: ExerciseId; sets: number } => record(e) && isExerciseId(e.id) && int(e.sets, 0, 10))
    .map((e) => ({ id: e.id, sets: e.sets }))
    .slice(0, 12);
  if (!exercises.length) return null;
  return { id: v.id, date: v.date, at: validInstant(v.at) ? v.at : `${v.date}T12:00:00.000Z`, location: v.location, focus: v.focus, exercises };
}

/** Salvage each valid field independently; never trust TypeScript types on stored JSON. */
function validate(value: unknown): AppState {
  if (!record(value)) return defaults();
  const state = defaults();
  state.theme = value.theme === 'light' || value.theme === 'dark' ? value.theme : 'auto';
  state.rememberActivity = value.rememberActivity !== false;
  state.lastLocation = isLocation(value.lastLocation) ? value.lastLocation : 'home';
  state.homeMissing = Array.isArray(value.homeMissing)
    ? [
        ...new Set(
          value.homeMissing.filter(
            (e): e is Equipment => typeof e === 'string' && Object.prototype.hasOwnProperty.call(EQUIPMENT, e) && EQUIPMENT[e as Equipment].optional === true,
          ),
        ),
      ]
    : [];
  if (Array.isArray(value.history)) {
    const seen = new Set<string>();
    state.history = value.history
      .map((v, i) => validLog(v, i))
      .filter((v): v is WorkoutLog => v !== null && !seen.has(v.id) && Boolean(seen.add(v.id)))
      .sort((a, b) => a.at.localeCompare(b.at))
      .slice(-MAX_HISTORY);
  }
  state.walks = Array.isArray(value.walks) ? [...new Set(value.walks.filter(validDate))].slice(-MAX_WALKS) : [];
  state.progress = validProgress(value.progress, value.useStepUps === true); // old A/B progress is migrated
  state.draft = validPlan(value.draft);
  return state;
}

/* ---------------- load / save ---------------- */

export function load(): AppState {
  if (session) return validate(session);
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? validate(JSON.parse(raw)) : defaults();
  } catch {
    return defaults();
  }
}

export function save(patch: Partial<AppState>): AppState {
  const next = validate({ ...load(), ...patch });
  // Keep a working in-memory state if persistence is disabled or unavailable.
  session = next;
  lastWriteSucceeded = false;
  try {
    const persisted = next.rememberActivity ? next : { ...defaults(), theme: next.theme, rememberActivity: false };
    // Removing first also clears old activity when a quota prevents writing the smaller preference.
    if (!next.rememberActivity) localStorage.removeItem(KEY);
    localStorage.setItem(KEY, JSON.stringify(persisted));
    lastWriteSucceeded = true;
    if (next.rememberActivity) session = null;
  } catch {
    /* The current page still retains its progress. */
  }
  return validate(next);
}

/** Opt-out clears persisted activity only; an active workout stays in memory. */
export function setRememberActivity(rememberActivity: boolean): boolean {
  save({ rememberActivity });
  return lastWriteSucceeded;
}

export const localDate = (d = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Saves a finished (or ended-early) workout. Exercises with no sets done are left out. */
export function finishWorkout(progress: Progress, now = new Date()): WorkoutLog | null {
  const exercises = progress.plan.exercises.map((id, i) => ({ id, sets: progress.setsDone[i] ?? 0 })).filter((e) => e.sets > 0);
  if (!exercises.length) {
    save({ progress: null });
    return null;
  }
  const log: WorkoutLog = {
    id: `w-${now.getTime().toString(36)}`,
    date: localDate(now),
    at: now.toISOString(),
    location: progress.plan.location,
    focus: progress.plan.focus,
    exercises,
  };
  save({ history: [...load().history, log], progress: null, draft: null });
  return log;
}

export function toggleWalk(date = localDate()): AppState {
  const { walks } = load();
  return save({ walks: walks.includes(date) ? walks.filter((d) => d !== date) : [...walks, date] });
}

/* ---------------- export / import ---------------- */

const EXPORT_APP = 'dads-home-workout';
export const MAX_IMPORT_BYTES = 2_000_000;

export function exportData(state = load()): string {
  return JSON.stringify({ app: EXPORT_APP, version: 2, exportedAt: new Date().toISOString(), history: state.history, walks: state.walks }, null, 2);
}

export type ImportResult = { ok: true; added: number; walksAdded: number; skipped: number } | { ok: false; error: string };

/** Merges an exported file into the current history (nothing is deleted or overwritten). */
export function importData(text: string): ImportResult {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: 'That file is too big to be a workout history.' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't a workout history (it can't be read)." };
  }
  if (!record(parsed) || parsed.app !== EXPORT_APP || !Array.isArray(parsed.history)) {
    return { ok: false, error: "That file isn't a workout history from this app." };
  }
  const current = load();
  // Deduplicate against what is already saved AND within the file itself.
  const seen = new Set(current.history.map((h) => h.id));
  const incoming: WorkoutLog[] = [];
  let skipped = 0;
  parsed.history.forEach((v, i) => {
    const log = validLog(v, i);
    if (!log || seen.has(log.id)) {
      skipped++;
      return;
    }
    seen.add(log.id);
    incoming.push(log);
  });
  const newWalks = [...new Set(Array.isArray(parsed.walks) ? parsed.walks.filter(validDate) : [])].filter((d) => !current.walks.includes(d));
  // Never make room by dropping existing records: refuse the whole import instead.
  if (current.history.length + incoming.length > MAX_HISTORY || current.walks.length + newWalks.length > MAX_WALKS) {
    return { ok: false, error: `That file would take the history past what the app can keep (${MAX_HISTORY} workouts). Nothing was changed.` };
  }
  save({ history: [...current.history, ...incoming], walks: [...current.walks, ...newWalks] });
  return { ok: true, added: incoming.length, walksAdded: newWalks.length, skipped };
}

/** Applies the saved theme to <html> (auto = follow the phone). */
export function applyTheme(theme: Theme = load().theme): void {
  if (theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}
