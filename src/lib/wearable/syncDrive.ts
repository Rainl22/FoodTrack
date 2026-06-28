/**
 * Health Connect sync pipeline for FoodTrack.
 *
 * Adapted from Peri's syncHealthConnect.ts. Changes:
 *   - Removed all Entry/Peri type references
 *   - Removed "save back to Drive" step (FoodTrack saves to Firestore via repositories)
 *   - Returns WearableDayRecord[] — callers write to Firestore themselves
 *   - Step list updated to reflect activity-focused (not sleep-focused) import
 */

import { openHealthConnectZip } from './sqlJsAdapter';
import { parseHealthConnect } from './parseHealthConnect';
import type { WearableDayRecord } from './types';

// ─── Step types ───────────────────────────────────────────────────────────────

export type SyncStepId =
  | 'finding'
  | 'downloading'
  | 'reading'
  | 'checking'
  | 'activity-steps'
  | 'activity-workouts'
  | 'heart-metrics'
  | 'temperature'
  | 'done';

export type SyncStepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

export interface SyncStep {
  id:     SyncStepId;
  label:  string;
  status: SyncStepStatus;
}

export type SyncProgressCallback = (steps: SyncStep[]) => void;

const STEP_LABELS: Record<SyncStepId, string> = {
  finding:            'Finding Health Connect export in Google Drive',
  downloading:        'Downloading export',
  reading:            'Reading database',
  checking:           'Checking available data',
  'activity-steps':   'Importing daily steps and distance',
  'activity-workouts':'Importing workout sessions',
  'heart-metrics':    'Importing heart rate data',
  temperature:        'Importing temperature data',
  done:               'Sync complete',
};

// ─── Failure kinds ────────────────────────────────────────────────────────────

export type SyncFailureKind =
  | 'no_file'
  | 'db_empty'
  | 'parse_error'
  | 'network_error';

// ─── Result types ─────────────────────────────────────────────────────────────

export interface WearableSyncResult {
  success:       boolean;
  message:       string;
  daysImported:  number;
  warnings:      string[];
  failureKind?:  SyncFailureKind;
  records?:      WearableDayRecord[];
  fileName?:     string;
  dateRange?:    { from: string; to: string };
}

// ─── Drive helpers ────────────────────────────────────────────────────────────

async function findHealthConnectFile(
  token: string,
): Promise<{ id: string; name: string } | null> {
  const q = encodeURIComponent("name contains 'health_connect' and trashed = false");
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime+desc&fields=files(id,name,modifiedTime)&pageSize=5`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!resp.ok) throw new Error(`Drive search failed: ${resp.status}`);
  const data = await resp.json() as { files?: { id: string; name: string }[] };
  return data.files?.[0] ?? null;
}

async function downloadDriveFile(token: string, fileId: string): Promise<Uint8Array> {
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!resp.ok) throw new Error(`Drive download failed: ${resp.status}`);
  return new Uint8Array(await resp.arrayBuffer());
}

// ─── Main sync pipeline ───────────────────────────────────────────────────────

export async function syncHealthConnectFromDrive(
  token: string,
  onProgress?: SyncProgressCallback,
): Promise<WearableSyncResult> {
  const steps: SyncStep[] = [];

  function emit(id: SyncStepId, status: SyncStepStatus) {
    const existing = steps.find(s => s.id === id);
    if (existing) {
      existing.status = status;
    } else {
      steps.push({ id, label: STEP_LABELS[id], status });
    }
    onProgress?.([...steps]);
  }

  function fail(
    id: SyncStepId,
    result: Omit<WearableSyncResult, 'daysImported' | 'warnings'> & { warnings?: string[] },
  ): WearableSyncResult {
    emit(id, 'failed');
    return { daysImported: 0, warnings: [], ...result };
  }

  // ── Step 1: Find file ────────────────────────────────────────────────────
  emit('finding', 'running');
  let file: { id: string; name: string } | null;
  try {
    file = await findHealthConnectFile(token);
  } catch (err) {
    return fail('finding', {
      success: false,
      message: 'Could not search Google Drive. Check that Drive access has been granted.',
      failureKind: 'network_error',
      warnings: [String(err)],
    });
  }
  if (!file) {
    return fail('finding', {
      success: false,
      message: 'No Health Connect export found in Google Drive.',
      failureKind: 'no_file',
    });
  }
  emit('finding', 'done');

  // ── Step 2: Download ─────────────────────────────────────────────────────
  emit('downloading', 'running');
  let zipBytes: Uint8Array;
  try {
    zipBytes = await downloadDriveFile(token, file.id);
  } catch (err) {
    return fail('downloading', {
      success: false,
      message: `Found "${file.name}" but could not download it.`,
      failureKind: 'network_error',
      warnings: [String(err)],
    });
  }
  emit('downloading', 'done');

  // ── Step 3: Open database ────────────────────────────────────────────────
  emit('reading', 'running');
  let db;
  try {
    db = await openHealthConnectZip(zipBytes);
  } catch (err) {
    return fail('reading', {
      success: false,
      message: 'Found the export but could not read it. The file may be corrupt.',
      failureKind: 'parse_error',
      warnings: [String(err)],
    });
  }
  emit('reading', 'done');

  // ── Step 4: Parse ────────────────────────────────────────────────────────
  emit('checking', 'running');
  const parseResult = parseHealthConnect(db, { source: 'samsung_health' });
  db.close();

  if (!parseResult.success || !parseResult.result) {
    const isPermissionIssue = parseResult.message.includes('no health records');
    return fail('checking', {
      success: false,
      message: parseResult.message,
      failureKind: isPermissionIssue ? 'db_empty' : 'parse_error',
    });
  }
  emit('checking', 'done');

  const { records, warnings } = parseResult.result;

  // ── Steps 5–8: Emit per-metric progress ──────────────────────────────────
  const activities = records.map(r => r.wearable.activity).filter(Boolean);
  if (activities.some(a => (a?.steps ?? 0) > 0)) {
    emit('activity-steps', 'running'); emit('activity-steps', 'done');
  }
  if (activities.some(a => (a?.workoutSessions?.length ?? 0) > 0)) {
    emit('activity-workouts', 'running'); emit('activity-workouts', 'done');
  }
  if (records.some(r => r.wearable.heart != null)) {
    emit('heart-metrics', 'running'); emit('heart-metrics', 'done');
  }
  if (records.some(r => r.wearable.temperature != null)) {
    emit('temperature', 'running'); emit('temperature', 'done');
  }

  emit('done', 'done');

  const dates = records.map(r => r.date).sort();
  return {
    success:      true,
    message:      `Synced ${records.length} day${records.length !== 1 ? 's' : ''} from ${file.name}.`,
    daysImported: records.length,
    warnings,
    records,
    fileName:     file.name,
    dateRange:    dates.length > 0 ? { from: dates[0], to: dates[dates.length - 1] } : undefined,
  };
}
