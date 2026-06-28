import type { DbAdapter, DbRow } from './dbAdapter';
import type {
  WearableImportResult,
  WearableDayRecord,
  WearableData,
  WearableSleep,
  WearableSleepStages,
  WearableHeart,
  WearableActivity,
  WearableWorkoutSession,
  WearableTemperature,
} from './types';
import {
  HC_SLEEP_STAGE_MAP,
  HC_EXERCISE_TYPE_MAP,
} from './types';
import {
  normalizeWorkout,
  sessionToRaw,
  slugifyWorkoutType,
} from './workoutNormalization';

// ─── Debug summary ────────────────────────────────────────────────────────────

export interface HealthConnectDebugSummary {
  databaseValid: boolean;
  connectedApps: string[];
  tableCounts: Record<string, number>;
  hasSleepData: boolean;
  hasHeartData: boolean;
  hasActivityData: boolean;
  hasExerciseData: boolean;
  hasTemperatureData: boolean;
  importableDateRange?: { start: string; end: string };
}

// ─── Parse result — wraps WearableImportResult with debug info ────────────────

export interface HealthConnectParseResult {
  success: boolean;
  /** Human-readable message — shown directly in the UI on failure. */
  message: string;
  debug: HealthConnectDebugSummary;
  result?: WearableImportResult;
}

// ─── Internal constants ───────────────────────────────────────────────────────

const HEALTH_TABLES = [
  'sleep_session_record_table',
  'sleep_stages_table',
  'heart_rate_record_table',
  'heart_rate_record_series_table',
  'heart_rate_variability_rmssd_record_table',
  'resting_heart_rate_record_table',
  'steps_record_table',
  'distance_record_table',
  'active_calories_burned_record_table',
  'total_calories_burned_record_table',
  'exercise_session_record_table',
  'exercise_segments_table',
  'activity_intensity_record_table',
  'floors_climbed_record_table',
  'oxygen_saturation_record_table',
  'respiratory_rate_record_table',
  'skin_temperature_record_table',
  'skin_temperature_delta_table',
  'body_temperature_record_table',
  'basal_body_temperature_record_table',
  'vo2_max_record_table',
  'basal_metabolic_rate_record_table',
  'weight_record_table',
] as const;

const IDENTITY_TABLES = [
  'android_metadata',
  'application_info_table',
  'sleep_session_record_table',
  'heart_rate_record_table',
  'steps_record_table',
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeQuery(db: DbAdapter, sql: string, params?: (string | number | null)[]): DbRow[] {
  try {
    return db.query(sql, params);
  } catch {
    return [];
  }
}

function countRows(db: DbAdapter, table: string): number {
  const rows = safeQuery(db, `SELECT COUNT(*) AS n FROM "${table}"`);
  return rows.length > 0 ? (rows[0].n as number) ?? 0 : 0;
}

function tableExists(db: DbAdapter, table: string): boolean {
  const rows = safeQuery(
    db,
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    [table]
  );
  return rows.length > 0;
}

function localDateToIso(localDate: number): string | null {
  if (localDate == null || isNaN(localDate)) return null;
  const n = Math.floor(localDate);
  const s = String(n);

  // Standard Health Connect: YYYYMMDD integer (8 digits)
  if (s.length === 8) {
    const result = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
    return isNaN(new Date(result).getTime()) ? null : result;
  }

  // Health Sync: days since Unix epoch (5–6 digit integer, ~10000–30000 covers 1997–2052)
  if (n >= 10000 && n <= 30000) {
    const d = new Date(n * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  return null;
}

function epochToIso(epochMs: number, zoneOffsetSeconds = 0): string {
  if (epochMs == null || isNaN(epochMs)) return '';
  const d = new Date(epochMs + zoneOffsetSeconds * 1000);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

function msToMinutes(ms: number): number {
  return Math.round(ms / 60000);
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateDatabase(db: DbAdapter): { valid: boolean; reason?: string } {
  // A valid Health Connect db must have these identity tables
  for (const t of IDENTITY_TABLES) {
    if (!tableExists(db, t)) {
      return { valid: false, reason: `Expected table "${t}" not found` };
    }
  }
  return { valid: true };
}

// ─── Connected apps ───────────────────────────────────────────────────────────

function getConnectedApps(db: DbAdapter): string[] {
  const rows = safeQuery(db, `SELECT package_name FROM application_info_table WHERE package_name IS NOT NULL`);
  return rows.map(r => r.package_name as string).filter(Boolean);
}

// ─── Date range ───────────────────────────────────────────────────────────────

function getImportableDateRange(
  db: DbAdapter
): { start: string; end: string } | undefined {
  // Sleep is the most complete date anchor; fall back to steps
  const tables = [
    { table: 'sleep_session_record_table', col: 'local_date' },
    { table: 'steps_record_table', col: 'local_date' },
    { table: 'exercise_session_record_table', col: 'local_date' },
  ];

  for (const { table, col } of tables) {
    if (countRows(db, table) === 0) continue;
    const rows = safeQuery(db, `SELECT MIN(${col}) AS mn, MAX(${col}) AS mx FROM "${table}"`);
    if (rows.length > 0 && rows[0].mn && rows[0].mx) {
      const start = localDateToIso(rows[0].mn as number);
      const end   = localDateToIso(rows[0].mx as number);
      if (start && end) return { start, end };
    }
  }
  return undefined;
}

// ─── Sleep parsing ────────────────────────────────────────────────────────────

function parseSleepForDate(db: DbAdapter, localDate: number): WearableSleep | undefined {
  const sessions = safeQuery(
    db,
    `SELECT row_id, start_time, end_time, start_zone_offset FROM sleep_session_record_table WHERE local_date = ?`,
    [localDate]
  );
  if (sessions.length === 0) return undefined;

  // Use the longest session if multiple exist for the same date
  const session = sessions.reduce((best, s) => {
    const dur = (s.end_time as number) - (s.start_time as number);
    const bestDur = (best.end_time as number) - (best.start_time as number);
    return dur > bestDur ? s : best;
  });

  const startMs = session.start_time as number;
  const endMs = session.end_time as number;
  if (startMs == null || endMs == null || isNaN(startMs) || isNaN(endMs)) return undefined;
  const zoneOffset = (session.start_zone_offset as number) ?? 0;
  const timeInBedMs = endMs - startMs;

  const sleepStart = epochToIso(startMs, zoneOffset);
  const sleepEnd   = epochToIso(endMs, zoneOffset);
  if (!sleepStart || !sleepEnd) return undefined;

  const sleep: WearableSleep = {
    sleepStart,
    sleepEnd,
    timeInBedMinutes: msToMinutes(timeInBedMs),
    totalSleepMinutes: msToMinutes(timeInBedMs), // refined below if stages exist
  };

  // Sleep stages
  const stages = safeQuery(
    db,
    `SELECT stage_start_time, stage_end_time, stage_type FROM sleep_stages_table WHERE parent_key = ?`,
    [session.row_id as number]
  );

  if (stages.length > 0) {
    const acc: WearableSleepStages = { awakeMinutes: 0, lightMinutes: 0, deepMinutes: 0, remMinutes: 0, unknownMinutes: 0 };

    for (const s of stages) {
      const durMin = msToMinutes((s.stage_end_time as number) - (s.stage_start_time as number));
      const stageType = s.stage_type as number;
      const key = HC_SLEEP_STAGE_MAP[stageType];
      if (key && key !== 'unknown') {
        acc[key] = (acc[key] ?? 0) + durMin;
      } else {
        acc.unknownMinutes = (acc.unknownMinutes ?? 0) + durMin;
      }
    }

    sleep.stages = acc;
    sleep.totalSleepMinutes = acc.lightMinutes + acc.deepMinutes + acc.remMinutes;
    sleep.sleepEfficiencyPct = sleep.timeInBedMinutes > 0
      ? Math.round((sleep.totalSleepMinutes / sleep.timeInBedMinutes) * 100)
      : undefined;
  }

  // HR during sleep window
  const hrRows = safeQuery(
    db,
    `SELECT beats_per_minute FROM heart_rate_record_series_table s
     JOIN heart_rate_record_table r ON s.parent_key = r.row_id
     WHERE s.epoch_millis >= ? AND s.epoch_millis <= ?`,
    [startMs, endMs]
  );
  if (hrRows.length > 0) {
    const bpms = hrRows.map(r => r.beats_per_minute as number);
    sleep.heartRate = {
      averageBpm: Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length),
      lowestBpm: Math.min(...bpms),
    };
  }

  // SpO2 during sleep window
  const spo2Rows = safeQuery(
    db,
    `SELECT percentage FROM oxygen_saturation_record_table WHERE time >= ? AND time <= ?`,
    [startMs, endMs]
  );
  if (spo2Rows.length > 0) {
    const vals = spo2Rows.map(r => r.percentage as number);
    sleep.averageSpO2 = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }

  // Respiratory rate during sleep window
  const rrRows = safeQuery(
    db,
    `SELECT rate FROM respiratory_rate_record_table WHERE time >= ? AND time <= ?`,
    [startMs, endMs]
  );
  if (rrRows.length > 0) {
    const vals = rrRows.map(r => r.rate as number);
    sleep.averageRespiratoryRate = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }

  // HRV during sleep window
  const hrvRows = safeQuery(
    db,
    `SELECT heart_rate_variability_millis FROM heart_rate_variability_rmssd_record_table WHERE time >= ? AND time <= ?`,
    [startMs, endMs]
  );
  if (hrvRows.length > 0) {
    const vals = hrvRows.map(r => r.heart_rate_variability_millis as number);
    sleep.sleepHRV = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }

  // Derived quality score (1–5) from stages + efficiency
  if (sleep.stages && sleep.timeInBedMinutes > 0) {
    const totalSleep = sleep.totalSleepMinutes;
    const deepPct = totalSleep > 0 ? sleep.stages.deepMinutes / totalSleep : 0;
    const remPct = totalSleep > 0 ? sleep.stages.remMinutes / totalSleep : 0;
    const eff = (sleep.sleepEfficiencyPct ?? 70) / 100;
    // Weighted score → normalize to 1–5
    const raw = deepPct * 2.0 + remPct * 1.5 + eff * 1.5;
    // raw max ≈ 5 (20% deep + 25% REM + 100% eff = 0.4 + 0.375 + 1.5 = 2.275... scale to 5)
    sleep.derivedQuality = Math.min(5, Math.max(1, Math.round((raw / 2.275) * 4 + 1)));
  }

  return sleep;
}

// ─── Heart parsing ────────────────────────────────────────────────────────────

function parseHeartForDate(db: DbAdapter, localDate: number): WearableHeart | undefined {
  const result: WearableHeart = {};

  const rhr = safeQuery(
    db,
    `SELECT beats_per_minute FROM resting_heart_rate_record_table WHERE local_date = ? ORDER BY time DESC LIMIT 1`,
    [localDate]
  );
  if (rhr.length > 0) result.restingHeartRate = rhr[0].beats_per_minute as number;

  const hrv = safeQuery(
    db,
    `SELECT heart_rate_variability_millis FROM heart_rate_variability_rmssd_record_table WHERE local_date = ?`,
    [localDate]
  );
  if (hrv.length > 0) {
    const vals = hrv.map(r => r.heart_rate_variability_millis as number);
    result.heartRateVariability = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }

  const vo2 = safeQuery(
    db,
    `SELECT vo2_milliliters_per_minute_kilogram FROM vo2_max_record_table WHERE local_date = ? ORDER BY time DESC LIMIT 1`,
    [localDate]
  );
  if (vo2.length > 0) result.vo2Max = vo2[0].vo2_milliliters_per_minute_kilogram as number;

  const hrRows = safeQuery(
    db,
    `SELECT beats_per_minute FROM heart_rate_record_series_table s
     JOIN heart_rate_record_table r ON s.parent_key = r.row_id
     WHERE r.local_date = ?`,
    [localDate]
  );
  if (hrRows.length > 0) {
    const bpms = hrRows.map(r => r.beats_per_minute as number);
    result.averageHeartRate = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);
    result.lowestHeartRate = Math.min(...bpms);
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

// ─── Activity parsing ─────────────────────────────────────────────────────────

function parseActivityForDate(
  db: DbAdapter,
  localDate: number,
  sourceLabel: string,
): WearableActivity | undefined {
  const result: WearableActivity = {};

  const steps = safeQuery(
    db,
    `SELECT SUM(count) AS total FROM steps_record_table WHERE local_date = ?`,
    [localDate]
  );
  if (steps.length > 0 && steps[0].total != null) result.steps = steps[0].total as number;

  const dist = safeQuery(
    db,
    `SELECT SUM(distance) AS total FROM distance_record_table WHERE local_date = ?`,
    [localDate]
  );
  if (dist.length > 0 && dist[0].total != null) result.distanceMeters = dist[0].total as number;

  const activeCal = safeQuery(
    db,
    `SELECT SUM(energy) AS total FROM active_calories_burned_record_table WHERE local_date = ?`,
    [localDate]
  );
  if (activeCal.length > 0 && activeCal[0].total != null) result.activeCaloriesKcal = activeCal[0].total as number;

  const totalCal = safeQuery(
    db,
    `SELECT SUM(energy) AS total FROM total_calories_burned_record_table WHERE local_date = ?`,
    [localDate]
  );
  if (totalCal.length > 0 && totalCal[0].total != null) result.totalCaloriesKcal = totalCal[0].total as number;

  const floors = safeQuery(
    db,
    `SELECT SUM(floors) AS total FROM floors_climbed_record_table WHERE local_date = ?`,
    [localDate]
  );
  if (floors.length > 0 && floors[0].total != null) result.floorsClimbed = floors[0].total as number;

  const intensityMs = safeQuery(
    db,
    `SELECT SUM(end_time - start_time) AS total_ms FROM activity_intensity_record_table WHERE local_date = ?`,
    [localDate]
  );
  if (intensityMs.length > 0 && intensityMs[0].total_ms != null) {
    result.activeMinutes = msToMinutes(intensityMs[0].total_ms as number);
  }

  const bmr = safeQuery(
    db,
    `SELECT basal_metabolic_rate FROM basal_metabolic_rate_record_table WHERE local_date = ? ORDER BY time DESC LIMIT 1`,
    [localDate]
  );
  if (bmr.length > 0) result.basalMetabolicRateWatts = bmr[0].basal_metabolic_rate as number;

  // Exercise sessions
  const sessions = safeQuery(
    db,
    `SELECT row_id, uuid, start_time, end_time, start_zone_offset, exercise_type, title, session_rate_of_perceived_exertion, app_info_id
     FROM exercise_session_record_table WHERE local_date = ?`,
    [localDate]
  );

  if (sessions.length > 0) {
    result.workoutSessions = sessions.map(s => {
      const startMs = s.start_time as number;
      const endMs = s.end_time as number;
      const zoneOffset = (s.start_zone_offset as number) ?? 0;
      const exerciseType = s.exercise_type as number;
      const exerciseLabel = HC_EXERCISE_TYPE_MAP[exerciseType] ?? `Type ${exerciseType}`;

      const session: WearableWorkoutSession = {
        sessionId: String(s.row_id),
        exerciseType,
        exerciseLabel,
        // Raw source evidence — preserved forever
        originalType: slugifyWorkoutType(exerciseLabel),
        originalLabel: exerciseLabel,
        startTime: epochToIso(startMs, zoneOffset),
        endTime: epochToIso(endMs, zoneOffset),
        durationMinutes: msToMinutes(endMs - startMs),
        title: s.title as string | undefined,
        rpe: s.session_rate_of_perceived_exertion != null
          ? (s.session_rate_of_perceived_exertion as number)
          : undefined,
        source: sourceLabel,
      };

      // HR during workout
      const workoutHr = safeQuery(
        db,
        `SELECT beats_per_minute FROM heart_rate_record_series_table s
         JOIN heart_rate_record_table r ON s.parent_key = r.row_id
         WHERE s.epoch_millis >= ? AND s.epoch_millis <= ?`,
        [startMs, endMs]
      );
      if (workoutHr.length > 0) {
        const bpms = workoutHr.map(r => r.beats_per_minute as number);
        session.averageHeartRateBpm = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);
        session.maxHeartRateBpm = Math.max(...bpms);
      }

      // Calories for workout window (active)
      const wktCal = safeQuery(
        db,
        `SELECT SUM(energy) AS total FROM active_calories_burned_record_table WHERE start_time >= ? AND end_time <= ?`,
        [startMs, endMs]
      );
      if (wktCal.length > 0 && wktCal[0].total != null) {
        session.activeCaloriesKcal = wktCal[0].total as number;
      }

      // Distance for workout window
      const wktDist = safeQuery(
        db,
        `SELECT SUM(distance) AS total FROM distance_record_table WHERE start_time >= ? AND end_time <= ?`,
        [startMs, endMs]
      );
      if (wktDist.length > 0 && wktDist[0].total != null) {
        session.distanceMeters = wktDist[0].total as number;
      }

      // Normalization snapshot — Peri's internal workout language
      const normalized = normalizeWorkout(sessionToRaw(session));
      session.normalizedType = normalized.normalizedType;
      session.intensity = normalized.intensity;
      session.classificationConfidence = normalized.classificationConfidence;
      session.strainScore = normalized.strainScore;

      return session;
    });
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

// ─── Temperature parsing ──────────────────────────────────────────────────────

function parseTemperatureForDate(
  db: DbAdapter,
  localDate: number,
  sourceLabel: string,
): WearableTemperature | undefined {
  const result: WearableTemperature = {};

  // Skin temperature (overnight wrist) ─────────────────────────────────────
  // Multiple sessions can exist; use the most recent one (ORDER BY start_time DESC).
  const skinSessions = safeQuery(
    db,
    `SELECT row_id, baseline, start_time FROM skin_temperature_record_table
     WHERE local_date = ? ORDER BY start_time DESC`,
    [localDate],
  );

  if (skinSessions.length > 0) {
    const s = skinSessions[0];
    if (s.baseline != null) result.skinTempC = s.baseline as number;

    if (s.start_time != null) {
      result.measurementTime = epochToIso(s.start_time as number);
    }

    const deltas = safeQuery(
      db,
      `SELECT epoch_millis, delta FROM skin_temperature_delta_table WHERE parent_key = ?`,
      [s.row_id as number],
    );
    if (deltas.length > 0) {
      const vals = deltas.map(r => r.delta as number);
      result.overnightDeviationC = Math.max(...vals);
      result.skinTempDeltaSeries = deltas.map(r => ({
        epochMs: (r.epoch_millis as number) ?? 0,
        delta:   r.delta as number,
      }));
    }
  }

  // Body temperature (point-in-time thermometer reading) ────────────────────
  const bodyTemp = safeQuery(
    db,
    `SELECT temperature, time FROM body_temperature_record_table
     WHERE local_date = ? ORDER BY time DESC LIMIT 1`,
    [localDate],
  );
  if (bodyTemp.length > 0) {
    result.bodyTempC = bodyTemp[0].temperature as number;
    // Fall back to body-temp time if no skin-temp session was found
    if (result.measurementTime == null && bodyTemp[0].time != null) {
      result.measurementTime = epochToIso(bodyTemp[0].time as number);
    }
  }

  // Basal body temperature ──────────────────────────────────────────────────
  const bbt = safeQuery(
    db,
    `SELECT temperature FROM basal_body_temperature_record_table
     WHERE local_date = ? ORDER BY time DESC LIMIT 1`,
    [localDate],
  );
  if (bbt.length > 0) result.basalBodyTemperature = bbt[0].temperature as number;

  if (Object.keys(result).length === 0) return undefined;

  result.source = sourceLabel;
  return result;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function parseHealthConnect(
  db: DbAdapter,
  options: { source?: string } = {}
): HealthConnectParseResult {
  const warnings: string[] = [];

  // Step 1 — validate the database
  const validation = validateDatabase(db);
  if (!validation.valid) {
    return {
      success: false,
      message: `This does not appear to be a valid Health Connect database. ${validation.reason ?? ''}`.trim(),
      debug: {
        databaseValid: false,
        connectedApps: [],
        tableCounts: {},
        hasSleepData: false,
        hasHeartData: false,
        hasActivityData: false,
        hasExerciseData: false,
        hasTemperatureData: false,
      },
    };
  }

  // Step 2 — connected apps
  const connectedApps = getConnectedApps(db);

  // Step 3 — row counts for all health tables
  const tableCounts: Record<string, number> = {};
  for (const table of HEALTH_TABLES) {
    tableCounts[table] = countRows(db, table);
  }

  const hasSleepData = tableCounts['sleep_session_record_table'] > 0;
  const hasHeartData =
    tableCounts['resting_heart_rate_record_table'] > 0 ||
    tableCounts['heart_rate_record_table'] > 0 ||
    tableCounts['heart_rate_variability_rmssd_record_table'] > 0;
  const hasActivityData =
    tableCounts['steps_record_table'] > 0 ||
    tableCounts['active_calories_burned_record_table'] > 0 ||
    tableCounts['distance_record_table'] > 0;
  const hasExerciseData = tableCounts['exercise_session_record_table'] > 0;
  const hasTemperatureData =
    tableCounts['skin_temperature_record_table'] > 0 ||
    tableCounts['body_temperature_record_table'] > 0 ||
    tableCounts['basal_body_temperature_record_table'] > 0;

  const importableDateRange = getImportableDateRange(db);

  const debug: HealthConnectDebugSummary = {
    databaseValid: true,
    connectedApps,
    tableCounts,
    hasSleepData,
    hasHeartData,
    hasActivityData,
    hasExerciseData,
    hasTemperatureData,
    importableDateRange,
  };

  // Step 4 — empty database: return clear error
  const hasAnyData =
    hasSleepData || hasHeartData || hasActivityData || hasExerciseData || hasTemperatureData;

  if (!hasAnyData) {
    return {
      success: false,
      message:
        'Health Connect export found, but no health records are available yet. ' +
        'Check that Samsung Health has write permission to Health Connect, then wait for the next export.',
      debug,
    };
  }

  // Step 5 — collect all dates that have at least one health record
  const dateSet = new Set<number>();

  const dateSources = [
    'sleep_session_record_table',
    'resting_heart_rate_record_table',
    'steps_record_table',
    'exercise_session_record_table',
    'skin_temperature_record_table',
    'body_temperature_record_table',
    'heart_rate_variability_rmssd_record_table',
    'active_calories_burned_record_table',
    'distance_record_table',
    'oxygen_saturation_record_table',
  ] as const;

  for (const table of dateSources) {
    if (tableCounts[table] === 0) continue;
    const rows = safeQuery(db, `SELECT DISTINCT local_date FROM "${table}" WHERE local_date IS NOT NULL`);
    for (const r of rows) dateSet.add(r.local_date as number);
  }

  const sortedDates = Array.from(dateSet).sort();

  // Step 6 — parse each date
  const importedAt = new Date().toISOString();
  const sourceLabel = options.source ?? 'health_connect_generic';
  const records: WearableDayRecord[] = [];

  for (const localDate of sortedDates) {
    const dateStr = localDateToIso(localDate);
    if (!dateStr) continue;

    const sleep = parseSleepForDate(db, localDate);
    const heart = parseHeartForDate(db, localDate);
    const activity = parseActivityForDate(db, localDate, sourceLabel);
    const temperature = parseTemperatureForDate(db, localDate, sourceLabel);

    if (!sleep && !heart && !activity && !temperature) continue;

    const wearableData: WearableData = {
      source: sourceLabel as WearableData['source'],
      importedAt,
      ...(sleep && { sleep }),
      ...(heart && { heart }),
      ...(activity && { activity }),
      ...(temperature && { temperature }),
    };

    records.push({ date: dateStr, wearable: wearableData });
  }

  if (records.length === 0) {
    warnings.push('Data tables had rows but no parseable day records could be constructed.');
  }

  const dateRange =
    records.length > 0
      ? { from: records[0].date, to: records[records.length - 1].date }
      : { from: '', to: '' };

  return {
    success: true,
    message: `Imported ${records.length} day${records.length !== 1 ? 's' : ''} of wearable data (${dateRange.from} → ${dateRange.to}).`,
    debug,
    result: {
      source: sourceLabel as WearableImportResult['source'],
      importedAt,
      daysImported: records.length,
      dateRange,
      records,
      warnings,
    },
  };
}
