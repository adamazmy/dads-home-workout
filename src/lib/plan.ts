import { EXERCISES, type Exercise, WORKOUTS, type WorkoutId } from '../data/exercises';
import { load } from './storage';

/** The exercises of a workout, with the RDL swapped for step-ups if chosen. */
export function workoutExercises(id: WorkoutId, useStepUps = load().useStepUps): Exercise[] {
  return WORKOUTS[id].exercises.map((e) => EXERCISES[useStepUps && e === 'rdl' ? 'stepUp' : e]);
}

/** Rough duration in minutes: sets × (work + rest) + 5 min warm-up. */
export function estimateMinutes(list: Exercise[]): number {
  const secs = list.reduce((t, e) => t + e.sets * (50 + (e.kind === 'main' ? 75 : 45)), 0);
  return Math.round(secs / 60 / 5) * 5 + 5;
}
