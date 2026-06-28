/**
 * FoodTrack-specific adapter: WearableDayRecord → DayActivity.
 *
 * Written fresh (not ported from Peri). Peri's mergeSleep.ts merges into
 * its Entry type and cycle fields — none of that applies here.
 *
 * This module is pure TypeScript — no Firestore, no React.
 */

import type { WearableDayRecord } from './types';
import type { DayActivity } from '@/types/nutrition';
import { getNormalizedWorkouts } from './workoutNormalization';
import type { WorkoutType } from './workoutNormalization';

// ─── Derive training type from workout sessions ───────────────────────────────

function deriveTrainingType(
  workoutTypes: WorkoutType[],
  activeCalories: number,
): DayActivity['trainingType'] {
  if (workoutTypes.length === 0) {
    // No session — infer rest vs light activity from calories
    return activeCalories > 200 ? 'cardio' : 'rest';
  }

  const counts: Partial<Record<WorkoutType, number>> = {};
  for (const t of workoutTypes) {
    counts[t] = (counts[t] ?? 0) + 1;
  }

  // Majority wins; mixed if no clear winner
  const dominant = (Object.entries(counts) as [WorkoutType, number][])
    .sort(([, a], [, b]) => b - a)[0]?.[0];

  if (dominant === 'strength') return 'strength';
  if (dominant === 'cardio')   return 'cardio';
  if (dominant === 'mixed')    return 'mixed';
  if (workoutTypes.length > 1) return 'mixed';
  return 'rest';
}

// ─── Main converter ───────────────────────────────────────────────────────────

export function wearableRecordToDayActivity(
  record: WearableDayRecord,
): DayActivity {
  const activity = record.wearable.activity;
  const steps              = activity?.steps              ?? 0;
  const activeCaloriesKcal = activity?.activeCaloriesKcal ?? 0;
  const sessions           = activity?.workoutSessions    ?? [];

  const normalized = getNormalizedWorkouts(record.wearable);
  const workoutTypes = normalized.map(n => n.normalizedType);

  const meaningfulSessions = sessions.filter(s => (s.durationMinutes ?? 0) >= 15);
  const totalDurationMin = meaningfulSessions.reduce(
    (sum, s) => sum + (s.durationMinutes ?? 0),
    0,
  );

  const trainingDay = meaningfulSessions.length > 0 || steps > 7500;
  const trainingType = deriveTrainingType(workoutTypes, activeCaloriesKcal);

  return {
    steps,
    activeCaloriesKcal,
    trainingDay,
    trainingType,
    workoutCount:    meaningfulSessions.length,
    totalDurationMin,
  };
}

// ─── Batch converter ──────────────────────────────────────────────────────────

export function wearableRecordsToDayActivities(
  records: WearableDayRecord[],
): Array<{ date: string; activity: DayActivity }> {
  return records.map(r => ({
    date:     r.date,
    activity: wearableRecordToDayActivity(r),
  }));
}
