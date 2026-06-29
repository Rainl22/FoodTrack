'use client';

import { useCallback } from 'react';
import { useSyncStore, type SyncPhase } from '@/store/useSyncStore';
import { useUserStore } from '@/store/useUserStore';
import { requestDriveAccess } from '@/lib/firebase/auth';
import {
  healthSyncService,
  DriveAuthError,
  DriveDownloadError,
  ParseError,
  PersistenceError,
  type HealthSyncPhase,
} from '@/lib/healthSync';

export interface UseHealthSyncResult {
  phase:      SyncPhase;
  progress:   number;
  lastSyncAt: string | null;
  error:      string | null;
  startSync:  () => Promise<void>;
}

function toUserMessage(err: unknown): string {
  if (err instanceof DriveAuthError) {
    return 'Drive access expired. Please approve Drive access when prompted and retry.';
  }
  if (err instanceof DriveDownloadError) {
    return `Could not download Health Connect export: ${err.message}`;
  }
  if (err instanceof ParseError) {
    return `Could not read Health Connect data: ${err.message}`;
  }
  if (err instanceof PersistenceError) {
    return `Could not save activity data: ${err.message}`;
  }
  return err instanceof Error ? err.message : 'Sync failed. Please try again.';
}

function toSyncPhase(phase: HealthSyncPhase): SyncPhase {
  return phase;
}

export function useHealthSync(): UseHealthSyncResult {
  const phase          = useSyncStore((s) => s.phase);
  const progress       = useSyncStore((s) => s.progress);
  const lastSyncAt     = useSyncStore((s) => s.lastSyncAt);
  const error          = useSyncStore((s) => s.error);
  const setPhase       = useSyncStore((s) => s.setPhase);
  const setProgress    = useSyncStore((s) => s.setProgress);
  const setLastSyncAt  = useSyncStore((s) => s.setLastSyncAt);
  const setError       = useSyncStore((s) => s.setError);
  const reset          = useSyncStore((s) => s.reset);

  const user           = useUserStore((s) => s.user);
  const profile        = useUserStore((s) => s.profile);
  const driveToken     = useUserStore((s) => s.driveToken);
  const setDriveToken  = useUserStore((s) => s.setDriveToken);

  const startSync = useCallback(async (): Promise<void> => {
    if (!user || !profile) {
      setError('Sign in to use Health Connect sync.');
      return;
    }

    // Request Drive access on demand — only when the user initiates sync.
    // This keeps drive.readonly out of the initial sign-in flow so the
    // "unverified app" consent screen never appears for regular users.
    let token = driveToken;
    if (!token) {
      try {
        token = await requestDriveAccess();
      } catch {
        setError('Drive access is required for Health Connect sync. Please approve the request and try again.');
        return;
      }
      if (!token) {
        setError('Drive access was not granted. Health Connect sync requires read access to Google Drive.');
        return;
      }
      setDriveToken(token);
    }

    reset();
    setPhase('fetching_drive');

    try {
      await healthSyncService.sync({
        uid:        user.uid,
        driveToken: token,
        profile,
        onTokenRefresh: async () => {
          const newToken = await requestDriveAccess();
          if (newToken) setDriveToken(newToken);
          return newToken;
        },
        onProgress: (p: HealthSyncPhase, pct: number) => {
          setPhase(toSyncPhase(p));
          setProgress(pct);
        },
      });

      setLastSyncAt(new Date().toISOString());
      setPhase('done');
    } catch (err) {
      setPhase('error');
      setError(toUserMessage(err));
    }
  }, [user, profile, driveToken, reset, setPhase, setProgress, setLastSyncAt, setError, setDriveToken]);

  return { phase, progress, lastSyncAt, error, startSync };
}
