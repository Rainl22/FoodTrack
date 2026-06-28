// ─── Workout normalization layer ──────────────────────────────────────────────
// Device-agnostic workout language. Every source adapter (Samsung Health,
// Apple Health, Garmin, Fitbit, Oura, Polar, Whoop, …) translates into this.
//
// Pipeline:  Raw Device Data → Source Adapter → Normalization → User Overrides → Engines → UI
//
// Principles:
// 1. Raw source data is preserved forever (originalType / originalLabel are evidence).
// 2. Unknown workouts still contribute to strain and recovery (strainScore is
//    computed from physiological signals, independent of workout type).
// 3. Users can teach the system (userWorkoutMappings take precedence).
// 4. Adding a new device requires only an adapter + optional mapping additions.

import type { WearableWorkoutSession, WearableData } from './types';

// ─── Taxonomy ─────────────────────────────────────────────────────────────────

export type WorkoutType =
  | 'strength'
  | 'cardio'
  | 'mixed'
  | 'mobility'
  | 'sport'
  | 'dance'
  | 'recovery'
  | 'unknown';

export type WorkoutIntensity =
  | 'low'
  | 'moderate'
  | 'high'
  | 'unknown';

export type ClassificationConfidence =
  | 'high'
  | 'medium'
  | 'low';

export const WORKOUT_TYPES: WorkoutType[] = [
  'strength', 'cardio', 'mixed', 'mobility', 'sport', 'dance', 'recovery', 'unknown',
];

// Display names for normalized types — what insight engines and UI may show.
// Raw device-specific names must never leak into insight copy.
export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  strength: 'Strength',
  cardio:   'Cardio',
  mixed:    'Mixed training',
  mobility: 'Yoga & Mobility',
  sport:    'Sport',
  dance:    'Dance',
  recovery: 'Recovery',
  unknown:  'Other',
};

// ─── Raw workout (evidence layer — exactly what the device reported) ─────────

export interface RawWorkout {
  source: string;        // 'samsung_health' | 'apple_health' | 'garmin' | …
  originalType: string;  // canonical slug of the device-reported type, e.g. 'circuit_training'
  originalLabel: string; // human-readable device label, e.g. 'Circuit training'

  startTime: string;     // ISO datetime
  endTime: string;       // ISO datetime

  durationMin?: number;

  avgHr?: number;
  maxHr?: number;

  calories?: number;

  distanceKm?: number;

  metadata?: Record<string, unknown>;
}

// ─── Normalized workout ───────────────────────────────────────────────────────

export interface NormalizedWorkout {
  source: string;

  originalType: string;
  originalLabel: string;

  normalizedType: WorkoutType;

  intensity: WorkoutIntensity;

  classificationConfidence: ClassificationConfidence;

  durationMin?: number;

  avgHr?: number;

  maxHr?: number;

  calories?: number;

  distanceKm?: number;

  strainScore?: number;  // 0–10 — physiological strain, independent of type
}

// ─── Slug canonicalization ────────────────────────────────────────────────────

/** 'Running (treadmill)' → 'running_treadmill'; 'HIIT' → 'hiit' */
export function slugifyWorkoutType(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// ─── Known mapping table ──────────────────────────────────────────────────────
// Keyed by canonical originalType slug. Deliberately a thin lookup — the
// keyword + signal inference below is the safety net, and userWorkoutMappings
// always win. Keep additions one line per type; do not branch per device here.

export const workoutMappings: Record<string, WorkoutType> = {
  // strength
  strength_training: 'strength',
  functional_strength_training: 'strength',
  traditional_strength_training: 'strength',
  weightlifting: 'strength',
  weight_training: 'strength',
  resistance_training: 'strength',
  bodyweight_training: 'strength',
  calisthenics: 'strength',
  core_training: 'strength',

  // cardio
  running: 'cardio',
  running_treadmill: 'cardio',
  treadmill: 'cardio',
  jogging: 'cardio',
  walking: 'cardio',
  hiking: 'cardio',
  cycling: 'cardio',
  biking: 'cardio',
  biking_stationary: 'cardio',
  mountain_biking: 'cardio',
  spinning: 'cardio',
  swimming: 'cardio',
  swimming_pool: 'cardio',
  swimming_open_water: 'cardio',
  rowing: 'cardio',
  rowing_machine: 'cardio',
  elliptical: 'cardio',
  elliptical_training: 'cardio',
  stair_climbing: 'cardio',
  stair_climbing_machine: 'cardio',
  jump_rope: 'cardio',
  aerobics: 'cardio',
  cross_training: 'cardio',
  cardio: 'cardio',
  cross_country_skiing: 'cardio',

  // mixed
  hiit: 'mixed',
  high_intensity_interval_training: 'mixed',
  circuit_training: 'mixed',
  crossfit: 'mixed',
  boot_camp: 'mixed',
  hyrox: 'mixed',
  kickboxing: 'mixed',
  boxing: 'mixed',

  // mobility
  yoga: 'mobility',
  pilates: 'mobility',
  stretching: 'mobility',
  flexibility: 'mobility',
  mind_and_body: 'mobility',
  gymnastics: 'mobility',

  // sport
  volleyball: 'sport',
  badminton: 'sport',
  basketball: 'sport',
  baseball: 'sport',
  softball: 'sport',
  tennis: 'sport',
  table_tennis: 'sport',
  squash: 'sport',
  racquetball: 'sport',
  soccer: 'sport',
  football_soccer: 'sport',
  football_american: 'sport',
  football_australian: 'sport',
  handball: 'sport',
  ice_hockey: 'sport',
  rugby: 'sport',
  cricket: 'sport',
  golf: 'sport',
  rock_climbing: 'sport',
  climbing: 'sport',
  martial_arts: 'sport',
  fencing: 'sport',
  ice_skating: 'sport',
  skiing: 'sport',
  snowboarding: 'sport',
  surfing: 'sport',
  paddling: 'sport',
  sailing: 'sport',
  water_polo: 'sport',
  frisbee_disc: 'sport',

  // dance
  dancing: 'dance',
  dance: 'dance',
  zumba: 'dance',

  // recovery
  guided_breathing: 'recovery',
  meditation: 'recovery',
  cooldown: 'recovery',
};

// ─── User learning layer ──────────────────────────────────────────────────────
// Keyed "source:originalType", e.g. { "samsung_health:circuit_training": "mixed" }.
// Always takes precedence over the default mapping table.

export type UserWorkoutMappings = Record<string, WorkoutType>;

export const USER_WORKOUT_MAPPINGS_KEY = 'tuluna-user-workout-mappings';

export function userMappingKey(source: string, originalType: string): string {
  return `${source}:${originalType}`;
}

let cachedUserMappings: UserWorkoutMappings | null = null;

export function loadUserWorkoutMappings(): UserWorkoutMappings {
  if (cachedUserMappings) return cachedUserMappings;
  if (typeof window === 'undefined') return {};
  try {
    cachedUserMappings = JSON.parse(localStorage.getItem(USER_WORKOUT_MAPPINGS_KEY) ?? '{}');
  } catch {
    cachedUserMappings = {};
  }
  return cachedUserMappings!;
}

export function saveUserWorkoutMapping(
  source: string,
  originalType: string,
  type: WorkoutType,
): UserWorkoutMappings {
  const mappings = { ...loadUserWorkoutMappings(), [userMappingKey(source, originalType)]: type };
  cachedUserMappings = mappings;
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_WORKOUT_MAPPINGS_KEY, JSON.stringify(mappings));
  }
  return mappings;
}

/** Test/seeding helper — replaces the in-memory cache without touching storage. */
export function _setUserWorkoutMappingsForTest(mappings: UserWorkoutMappings | null): void {
  cachedUserMappings = mappings;
}

// ─── Keyword inference (medium confidence) ────────────────────────────────────

function inferTypeFromText(text: string): WorkoutType | null {
  const t = text.toLowerCase();
  if (/yoga|stretch|mobility|pilates|flexib/.test(t))                  return 'mobility';
  if (/meditat|breath|cooldown|recovery/.test(t))                      return 'recovery';
  if (/danc|zumba/.test(t))                                            return 'dance';
  if (/strength|weight|resistance|barbell|dumbbell|calisthenic/.test(t)) return 'strength';
  if (/hiit|interval|circuit|crossfit|boot ?camp/.test(t))             return 'mixed';
  if (/run|jog|cycl|bik|spin|swim|row|cardio|treadmill|elliptical|stair|aerobic|walk|hik/.test(t)) return 'cardio';
  return null;
}

// ─── Intensity inference (signal-based, independent of type) ──────────────────

export function inferIntensity(raw: RawWorkout, type: WorkoutType): WorkoutIntensity {
  const { avgHr, maxHr, durationMin, calories } = raw;

  if (avgHr != null && avgHr > 0) {
    if (avgHr >= 140) return 'high';
    if (avgHr >= 115) return 'moderate';
    return 'low';
  }
  if (maxHr != null && maxHr > 0) {
    if (maxHr >= 165) return 'high';
    if (maxHr >= 135) return 'moderate';
    return 'low';
  }
  if (calories != null && calories > 0 && durationMin != null && durationMin > 0) {
    const perMin = calories / durationMin;
    if (perMin >= 8) return 'high';
    if (perMin >= 5) return 'moderate';
    return 'low';
  }
  // No physiological signals — mobility/recovery sessions are low by nature
  if (type === 'mobility' || type === 'recovery') return 'low';
  return 'unknown';
}

// ─── Strain score (0–10) ──────────────────────────────────────────────────────
// Computed from duration + HR + calories only — never from the workout name.
// Unknown workouts must never become dead data: any session with at least one
// signal gets a score and feeds capacity, recovery, crash risk and trends.

export function calculateStrainScore(raw: {
  durationMin?: number;
  avgHr?: number;
  maxHr?: number;
  calories?: number;
}): number | undefined {
  const { durationMin, avgHr, maxHr, calories } = raw;
  if (durationMin == null && avgHr == null && maxHr == null && calories == null) {
    return undefined; // no signals at all — do not pretend certainty
  }

  let pts = 0;

  // Duration — up to 4 pts (20m→1, 40m→2, 60m→3, 80m+→4)
  if (durationMin != null && durationMin > 0) {
    pts += Math.min(4, (durationMin / 60) * 3);
  }

  // Average HR — up to 3 pts
  if (avgHr != null && avgHr > 0) {
    if      (avgHr >= 150) pts += 3;
    else if (avgHr >= 135) pts += 2.25;
    else if (avgHr >= 120) pts += 1.5;
    else if (avgHr >= 100) pts += 0.75;
    else                   pts += 0.25;
  }

  // Max HR — up to 1.5 pts
  if (maxHr != null && maxHr > 0) {
    if      (maxHr >= 170) pts += 1.5;
    else if (maxHr >= 155) pts += 1;
    else if (maxHr >= 140) pts += 0.5;
  }

  // Calories — up to 1.5 pts
  if (calories != null && calories > 0) {
    if      (calories >= 500) pts += 1.5;
    else if (calories >= 300) pts += 1;
    else if (calories >= 150) pts += 0.5;
    else                      pts += 0.25;
  }

  return Math.min(10, Math.round(pts * 10) / 10);
}

// ─── Normalization engine ─────────────────────────────────────────────────────
// Priority: 1. user overrides → 2. mapping table → 3. signal inference → 4. unknown

export function normalizeWorkout(
  raw: RawWorkout,
  userMappings: UserWorkoutMappings = loadUserWorkoutMappings(),
): NormalizedWorkout {
  let normalizedType: WorkoutType = 'unknown';
  let classificationConfidence: ClassificationConfidence = 'low';

  const userType = userMappings[userMappingKey(raw.source, raw.originalType)];
  const mapped   = workoutMappings[raw.originalType];
  const keyword  = inferTypeFromText(`${raw.originalType} ${raw.originalLabel}`);

  if (userType) {
    normalizedType = userType;
    classificationConfidence = 'high';            // the user told us
  } else if (mapped) {
    normalizedType = mapped;
    classificationConfidence = 'high';            // known mapping
  } else if (keyword) {
    normalizedType = keyword;
    classificationConfidence = 'medium';          // label keyword match
  } else if (raw.distanceKm != null && raw.distanceKm > 0.5) {
    normalizedType = 'cardio';                    // distance present → likely cardio
    classificationConfidence = 'low';
  } else if ((raw.durationMin ?? 0) >= 20) {
    normalizedType = 'mixed';                     // significant duration, unknown label
    classificationConfidence = 'low';
  }
  // else: unknown / low — no confidence, do not pretend certainty

  return {
    source: raw.source,
    originalType: raw.originalType,
    originalLabel: raw.originalLabel,
    normalizedType,
    intensity: inferIntensity(raw, normalizedType),
    classificationConfidence,
    durationMin: raw.durationMin,
    avgHr: raw.avgHr,
    maxHr: raw.maxHr,
    calories: raw.calories,
    distanceKm: raw.distanceKm,
    strainScore: calculateStrainScore(raw),
  };
}

// ─── Legacy session bridge ────────────────────────────────────────────────────
// Converts a stored WearableWorkoutSession (old or new shape) back into the
// RawWorkout evidence layer. Old entries lack originalType/originalLabel —
// derive them from exerciseLabel so existing data migrates automatically.

export function sessionToRaw(s: WearableWorkoutSession): RawWorkout {
  const originalLabel =
    s.originalLabel ?? s.exerciseLabel ?? (s.title || `Type ${s.exerciseType}`);
  return {
    source: s.source || 'health_connect_generic',
    originalType: s.originalType ?? slugifyWorkoutType(originalLabel),
    originalLabel,
    startTime: s.startTime,
    endTime: s.endTime,
    durationMin: s.durationMinutes,
    avgHr: s.averageHeartRateBpm,
    maxHr: s.maxHeartRateBpm,
    calories: s.activeCaloriesKcal,
    distanceKm: s.distanceMeters != null ? s.distanceMeters / 1000 : undefined,
    ...(s.title && { metadata: { title: s.title } }),
  };
}

/**
 * Normalize one stored session. Always recomputed (rather than trusting the
 * snapshot stamped at import) so later user overrides and mapping-table
 * improvements apply retroactively to already-imported workouts.
 */
export function normalizeSession(
  s: WearableWorkoutSession,
  userMappings: UserWorkoutMappings = loadUserWorkoutMappings(),
): NormalizedWorkout {
  return normalizeWorkout(sessionToRaw(s), userMappings);
}

/** All normalized workouts for a day record. The single engine entry point. */
export function getNormalizedWorkouts(
  wearable: WearableData | undefined,
  userMappings: UserWorkoutMappings = loadUserWorkoutMappings(),
): NormalizedWorkout[] {
  const sessions = wearable?.activity?.workoutSessions ?? [];
  return sessions.map(s => normalizeSession(s, userMappings));
}

// ─── Engine predicates (shared, source-agnostic) ──────────────────────────────

/** Walking & friends are background movement, not workout load (rule 7/8). */
export function isBackgroundActivity(n: NormalizedWorkout): boolean {
  return n.originalType === 'walking' || n.originalType.startsWith('walking_');
}

/** A session that counts as a real workout: not background, long enough. */
export function isMeaningfulWorkout(n: NormalizedWorkout, minDurationMin = 15): boolean {
  return !isBackgroundActivity(n) && (n.durationMin ?? 0) >= minDurationMin;
}

/** Sessions whose normalized type implies sustained cardio-style effort. */
export function countsAsCardioEffort(n: NormalizedWorkout): boolean {
  if (isBackgroundActivity(n)) return false;
  return n.normalizedType === 'cardio' || n.normalizedType === 'mixed' || n.normalizedType === 'dance';
}

// ─── Display helpers ──────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  samsung_health: 'Samsung Health',
  apple_health: 'Apple Health',
  garmin: 'Garmin',
  fitbit: 'Fitbit',
  oura: 'Oura',
  polar: 'Polar',
  whoop: 'Whoop',
  strava: 'Strava',
  health_connect_generic: 'Health Connect',
};

export function workoutSourceLabel(source: string): string {
  return (
    SOURCE_LABELS[source] ??
    source.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  );
}

/** Log History display: "Circuit training (Samsung Health)" — always the raw label. */
export function workoutDisplayLabel(n: Pick<NormalizedWorkout, 'originalLabel' | 'source'>): string {
  return `${n.originalLabel} (${workoutSourceLabel(n.source)})`;
}
