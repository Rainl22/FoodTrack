import { create } from 'zustand';

export type SyncPhase =
  | 'idle'
  | 'fetching_drive'
  | 'parsing'
  | 'writing'
  | 'done'
  | 'error';

interface SyncState {
  phase:      SyncPhase;
  progress:   number;         // 0–100
  lastSyncAt: string | null;  // ISO datetime of last successful sync
  error:      string | null;

  setPhase:      (phase: SyncPhase)      => void;
  setProgress:   (progress: number)      => void;
  setLastSyncAt: (at: string | null)     => void;
  setError:      (error: string | null)  => void;
  reset:         ()                      => void;
}

const INITIAL: Pick<SyncState, 'phase' | 'progress' | 'lastSyncAt' | 'error'> = {
  phase:      'idle',
  progress:   0,
  lastSyncAt: null,
  error:      null,
};

export const useSyncStore = create<SyncState>((set) => ({
  ...INITIAL,

  setPhase:      (phase)      => set({ phase }),
  setProgress:   (progress)   => set({ progress }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
  setError:      (error)      => set({ error }),
  reset:         ()           => set(INITIAL),
}));
