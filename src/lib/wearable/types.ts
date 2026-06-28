// Normalized wearable data model — source-agnostic
// Designed for Health Connect (Android), Apple Health, Garmin, Fitbit, Oura
// All times in ISO strings; durations in minutes; temperatures in Celsius

// ─── Source attribution ───────────────────────────────────────────────────────

export type WearableSource =
  | 'samsung_health'
  | 'apple_health'
  | 'garmin'
  | 'fitbit'
  | 'oura'
  | 'strava'
  | 'health_connect_generic'
  | string; // forward-compatible

// ─── Sleep ────────────────────────────────────────────────────────────────────

export interface WearableSleepStages {
  awakeMinutes: number;
  lightMinutes: number;
  deepMinutes: number;
  remMinutes: number;
  unknownMinutes?: number;
}

export interface WearableSleepHR {
  averageBpm: number;
  lowestBpm: number;
}

export interface WearableSleep {
  sleepStart: string;           // ISO datetime
  sleepEnd: string;             // ISO datetime
  timeInBedMinutes: number;     // end - start
  totalSleepMinutes: number;    // timeInBed - awake
  sleepEfficiencyPct?: number;  // totalSleep / timeInBed * 100
  stages?: WearableSleepStages;
  heartRate?: WearableSleepHR;
  averageSpO2?: number;         // %
  averageRespiratoryRate?: number; // breaths/min
  sleepHRV?: number;            // RMSSD ms — averaged within sleep window
  // Samsung Health exports a proprietary 0–100 score.
  // When not available, derivedQuality is computed from stages + efficiency.
  sleepScore?: number;          // 0–100 proprietary (if available)
  derivedQuality?: number;      // 1–5 computed — maps to entry.sleepq candidate
}

// ─── Heart & Recovery ─────────────────────────────────────────────────────────

export interface WearableHeart {
  restingHeartRate?: number;    // bpm
  heartRateVariability?: number; // RMSSD ms — daily/morning reading
  averageHeartRate?: number;    // bpm — daily average
  lowestHeartRate?: number;     // bpm — daily minimum
  vo2Max?: number;              // mL/kg/min
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export type HealthConnectExerciseType = number; // Health Connect integer exercise type codes

export interface WearableWorkoutSession {
  sessionId: string;
  exerciseType: HealthConnectExerciseType;
  exerciseLabel?: string;       // human-readable label mapped from type code

  // ── Raw source evidence — preserved forever, never overwritten ──
  originalType?: string;        // canonical slug of the device-reported type, e.g. 'circuit_training'
  originalLabel?: string;       // device-reported label, verbatim, e.g. 'Circuit training'

  startTime: string;            // ISO datetime
  endTime: string;              // ISO datetime
  durationMinutes: number;
  title?: string;
  averageHeartRateBpm?: number;
  maxHeartRateBpm?: number;
  activeCaloriesKcal?: number;
  distanceMeters?: number;
  rpe?: number;                 // 1–10 rate of perceived exertion (Health Connect: 1–10 scale)
  source: WearableSource;
  sourceApp?: string;           // package name e.g. "com.strava"

  // ── Normalization snapshot (stamped at import) ──
  // Engines re-normalize lazily via getNormalizedWorkouts() so that user
  // overrides and mapping improvements apply retroactively; these stored
  // values document what the import concluded at the time.
  normalizedType?: import('./workoutNormalization').WorkoutType;
  intensity?: import('./workoutNormalization').WorkoutIntensity;
  classificationConfidence?: import('./workoutNormalization').ClassificationConfidence;
  strainScore?: number;         // 0–10 — signal-based, independent of type
}

export interface WearableActivity {
  steps?: number;
  distanceMeters?: number;
  activeCaloriesKcal?: number;
  totalCaloriesKcal?: number;
  activeMinutes?: number;       // computed from activity_intensity_record
  floorsClimbed?: number;
  basalMetabolicRateWatts?: number; // BMR in Watts (Health Connect standard)
  workoutSessions?: WearableWorkoutSession[];
}

// ─── Stress (derived — no direct HC field) ───────────────────────────────────

export interface WearableStress {
  // Health Connect has no stress score. These are derived signals.
  hrvSuppression?: boolean;     // HRV significantly below personal baseline
  elevatedRestingHR?: boolean;  // RHR significantly above personal baseline
  mindfulnessMinutes?: number;  // from mindfulness_session_record
  // Future: Samsung stress score if ever exposed via HC
}

// ─── Temperature ──────────────────────────────────────────────────────────────

export interface WearableTemperature {
  // Primary scalars — populated by Phase 7A import; stored only, not used in calculations
  skinTempC?: number;           // °C — nightly baseline skin temperature (wrist)
  bodyTempC?: number;           // °C — point-in-time body temperature
  overnightDeviationC?: number; // °C — max delta from baseline within session
  measurementTime?: string;     // ISO datetime of the most recent measurement
  source?: string;              // originating app / device name

  // Detailed delta series — stored for future analysis, not exposed in UI yet
  skinTempDeltaSeries?: Array<{ epochMs: number; delta: number }>;

  // Basal body temperature (BBT) — stored only; not used in cycle calculations yet
  basalBodyTemperature?: number; // °C
}

// ─── Other physiological ──────────────────────────────────────────────────────

export interface WearablePhysiology {
  weight?: number;              // kg
  bodyFatPct?: number;          // %
  bloodPressureSystolic?: number;  // mmHg
  bloodPressureDiastolic?: number; // mmHg
  bloodGlucose?: number;        // mmol/L
  hydrationLiters?: number;
}

// ─── Top-level wearable block (attached to Entry) ────────────────────────────

export interface WearableData {
  source: WearableSource;
  sourceApp?: string;           // originating package name
  importedAt: string;           // ISO datetime of import
  exportedAt?: string;          // ISO datetime of the export file, if known
  lastModifiedTime?: number;    // epoch ms — for incremental import deduplication

  sleep?: WearableSleep;
  heart?: WearableHeart;
  activity?: WearableActivity;
  stress?: WearableStress;
  temperature?: WearableTemperature;
  physiology?: WearablePhysiology;
}

// ─── Import result types ──────────────────────────────────────────────────────

export interface WearableDayRecord {
  date: string;                 // YYYY-MM-DD
  wearable: WearableData;
}

export interface WearableImportResult {
  source: WearableSource;
  importedAt: string;
  daysImported: number;
  dateRange: { from: string; to: string };
  records: WearableDayRecord[];
  warnings: string[];           // non-fatal issues encountered during parsing
}

// ─── Merge policy ─────────────────────────────────────────────────────────────

// Controls how imported wearable data interacts with existing manual entry fields
export interface WearableMergePolicy {
  // 'auto' — silently fill entry.sleep if empty; skip if populated
  // 'prompt' — always ask user when wearable and manual differ
  // 'prefer_manual' — never overwrite manual; always use wearable as wearable.sleep only
  // 'prefer_wearable' — overwrite entry.sleep from watch data
  sleepDuration: 'auto' | 'prompt' | 'prefer_manual' | 'prefer_wearable';
  sleepQuality: 'auto' | 'prompt' | 'prefer_manual' | 'prefer_wearable';
  conflictThresholdMinutes: number; // default 30 — diff > this triggers 'prompt'
}

export const DEFAULT_MERGE_POLICY: WearableMergePolicy = {
  sleepDuration: 'auto',
  sleepQuality: 'prefer_manual',
  conflictThresholdMinutes: 30,
};

// ─── Health Connect stage type → normalized ───────────────────────────────────

export const HC_SLEEP_STAGE_MAP: Record<number, keyof WearableSleepStages | 'unknown'> = {
  0: 'unknown',     // UNKNOWN
  1: 'awakeMinutes', // AWAKE_IN_BED
  2: 'unknown',     // ASLEEP_UNSPECIFIED — counts toward total sleep but not a stage
  3: 'awakeMinutes', // OUT_OF_BED
  4: 'lightMinutes', // ASLEEP_LIGHT
  5: 'deepMinutes',  // ASLEEP_DEEP
  6: 'remMinutes',   // ASLEEP_REM
};

// ─── Health Connect exercise type → human label (partial map) ────────────────

export const HC_EXERCISE_TYPE_MAP: Record<number, string> = {
  2:  'Badminton',
  4:  'Baseball',
  5:  'Basketball',
  8:  'Biking',
  9:  'Biking (stationary)',
  10: 'Boot camp',
  11: 'Boxing',
  13: 'Calisthenics',
  14: 'Circuit training',
  15: 'Cricket',
  16: 'Cross-country skiing',
  17: 'Crossfit',
  18: 'Curling',
  19: 'Cycling',
  20: 'Dancing',
  22: 'Elliptical',
  23: 'Fencing',
  24: 'Football (American)',
  25: 'Football (Australian)',
  26: 'Football (soccer)',
  27: 'Frisbee disc',
  28: 'Golf',
  29: 'Guided breathing',
  30: 'Gymnastics',
  31: 'Handball',
  32: 'High intensity interval training',
  33: 'Hiking',
  34: 'Ice hockey',
  35: 'Ice skating',
  36: 'Inline skating',
  37: 'Martial arts',
  38: 'Orienteering',
  39: 'Paddling',
  40: 'Paragliding',
  41: 'Pilates',
  42: 'Polo',
  43: 'Racquetball',
  44: 'Rock climbing',
  45: 'Roller hockey',
  46: 'Rowing',
  47: 'Rowing (machine)',
  48: 'Rugby',
  49: 'Running',
  50: 'Running (treadmill)',
  51: 'Sailing',
  52: 'Scuba diving',
  53: 'Skating',
  54: 'Skiing',
  55: 'Snowboarding',
  56: 'Snowshoeing',
  57: 'Soccer',
  58: 'Softball',
  59: 'Squash',
  60: 'Stair climbing',
  61: 'Stair climbing (machine)',
  62: 'Strength training',
  63: 'Stretching',
  64: 'Surfing',
  65: 'Swimming (open water)',
  66: 'Swimming (pool)',
  67: 'Table tennis',
  68: 'Tennis',
  69: 'Volleyball',
  70: 'Walking',
  71: 'Water polo',
  72: 'Weightlifting',
  73: 'Wheelchair',
  74: 'Yoga',
  75: 'Other',
};

// ─── Menstruation flow mapping (for future cross-reference) ───────────────────

export const HC_FLOW_MAP: Record<number, string> = {
  0: 'unknown',
  1: 'light',
  2: 'medium',
  3: 'heavy',
  4: 'spotting',
};
