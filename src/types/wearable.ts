// Re-export wearable types from the parsing library.
// Components and domain code import from here — never directly from lib/wearable.
// This keeps the wearable library swappable without touching app code.

export type {
  WearableSource,
  WearableData,
  WearableDayRecord,
  WearableImportResult,
  WearableSleep,
  WearableSleepStages,
  WearableHeart,
  WearableActivity,
  WearableWorkoutSession,
  WearableTemperature,
  WearableMergePolicy,
} from '@/lib/wearable/types';

export type {
  WorkoutType,
  WorkoutIntensity,
  ClassificationConfidence,
  NormalizedWorkout,
  RawWorkout,
} from '@/lib/wearable/workoutNormalization';

export type {
  SyncStepId,
  SyncStepStatus,
  SyncStep,
  SyncProgressCallback,
  SyncFailureKind,
  WearableSyncResult,
} from '@/lib/wearable/syncDrive';
