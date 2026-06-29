'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

interface StepHealthConnectProps {
  defaultValue?: boolean;
  onFinish: (data: { healthConnectEnabled: boolean }) => void;
  onBack:   () => void;
  isSaving?: boolean;
}

export function StepHealthConnect({ defaultValue = false, onFinish, onBack, isSaving }: StepHealthConnectProps) {
  const [enabled, setEnabled] = useState(defaultValue);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Connect Samsung Health</h2>
        <p className="text-sm text-text-secondary mt-1">
          Sync wearable data to automatically adjust your daily targets on training days.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setEnabled(true)}
          className={cn(
            'flex flex-col items-start gap-0.5 w-full px-5 py-4 rounded-card border transition-colors text-left',
            enabled
              ? 'bg-brand-50 border-brand-500'
              : 'bg-surface-card border-surface-input',
          )}
        >
          <span className={cn('text-base font-semibold', enabled ? 'text-brand-600' : 'text-text-primary')}>
            Enable Health Connect sync
          </span>
          <span className="text-sm text-text-secondary">
            Sync steps, workout data, and active calories from Samsung Health.
          </span>
        </button>

        <button
          type="button"
          onClick={() => setEnabled(false)}
          className={cn(
            'flex flex-col items-start gap-0.5 w-full px-5 py-4 rounded-card border transition-colors text-left',
            !enabled
              ? 'bg-surface-input border-surface-input'
              : 'bg-surface-card border-surface-input',
          )}
        >
          <span className="text-base font-semibold text-text-primary">Skip for now</span>
          <span className="text-sm text-text-secondary">
            You can enable this later from your profile.
          </span>
        </button>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack} fullWidth disabled={isSaving}>
          Back
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={() => onFinish({ healthConnectEnabled: enabled })}
          fullWidth
          disabled={isSaving}
        >
          {isSaving ? 'Saving…' : 'Finish setup'}
        </Button>
      </div>
    </div>
  );
}
