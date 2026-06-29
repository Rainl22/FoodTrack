'use client';

import { Button } from '@/components/ui';
import { useHealthSync } from '@/hooks/useHealthSync';

export function SyncButton() {
  const { phase, startSync } = useHealthSync();
  const isBusy = phase !== 'idle' && phase !== 'done' && phase !== 'error';

  return (
    <Button
      variant="secondary"
      size="md"
      onClick={startSync}
      disabled={isBusy}
    >
      {isBusy ? 'Syncing…' : 'Sync Health Connect'}
    </Button>
  );
}
