'use client';

import { ProgressBar, Toast } from '@/components/ui';
import { useHealthSync } from '@/hooks/useHealthSync';

const PHASE_LABELS: Record<string, string> = {
  idle:           '',
  fetching_drive: 'Downloading from Drive…',
  parsing:        'Parsing Health Connect data…',
  writing:        'Saving activity data…',
  done:           'Sync complete',
  error:          'Sync failed',
};

export function SyncProgress() {
  const { phase, progress, lastSyncAt, error } = useHealthSync();

  if (phase === 'idle') return null;

  return (
    <div className="flex flex-col gap-2">
      {phase !== 'error' && phase !== 'done' && (
        <>
          <p className="text-sm text-text-secondary">{PHASE_LABELS[phase] ?? phase}</p>
          <ProgressBar value={progress} aria-label="Sync progress" />
        </>
      )}

      {phase === 'done' && lastSyncAt && (
        <p className="text-sm text-text-secondary">
          Last synced {new Date(lastSyncAt).toLocaleString()}
        </p>
      )}

      {error && (
        <Toast severity="error" message={error} />
      )}
    </div>
  );
}
