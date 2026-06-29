'use client';

import { useState } from 'react';
import { Button, Slider } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { ActivityLevel } from '@/types';

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'sedentary',          label: 'Sedentary',          description: 'Desk job, little or no exercise' },
  { value: 'lightly_active',     label: 'Lightly active',     description: 'Light exercise 1–3 days/week' },
  { value: 'moderately_active',  label: 'Moderately active',  description: 'Moderate exercise 3–5 days/week' },
  { value: 'very_active',        label: 'Very active',        description: 'Hard exercise 6–7 days/week' },
];

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-brand-500">
      <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

interface StepActivityData {
  activityLevel:       ActivityLevel;
  weeklyTrainingDays:  number;
}

interface StepActivityProps {
  defaultValues?: Partial<StepActivityData>;
  onNext: (data: StepActivityData) => void;
  onBack: () => void;
}

export function StepActivity({ defaultValues, onNext, onBack }: StepActivityProps) {
  const [level, setLevel]               = useState<ActivityLevel | undefined>(defaultValues?.activityLevel);
  const [trainingDays, setTrainingDays] = useState(defaultValues?.weeklyTrainingDays ?? 0);

  function handleNext() {
    if (!level) return;
    onNext({ activityLevel: level, weeklyTrainingDays: trainingDays });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Activity level</h2>
        <p className="text-sm text-text-secondary mt-1">This adjusts your TDEE (total daily energy expenditure).</p>
      </div>

      <div className="flex flex-col gap-2">
        {ACTIVITY_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setLevel(o.value)}
            className={cn(
              'flex items-center gap-3 w-full px-4 py-3 rounded-card border transition-colors text-left',
              level === o.value
                ? 'bg-brand-50 border-brand-500'
                : 'bg-surface-card border-surface-input hover:border-brand-300',
            )}
          >
            <div className="flex-1 flex flex-col gap-0.5">
              <span className={cn('text-sm font-semibold', level === o.value ? 'text-brand-600' : 'text-text-primary')}>
                {o.label}
              </span>
              <span className="text-xs text-text-secondary">{o.description}</span>
            </div>
            {level === o.value && <CheckIcon />}
          </button>
        ))}
      </div>

      <Slider
        label="Weekly training days"
        showValue
        min={0}
        max={7}
        step={1}
        value={trainingDays}
        onChange={(e) => setTrainingDays(parseInt(e.target.value))}
        formatValue={(v) => `${v} day${v === 1 ? '' : 's'}`}
      />

      {!level && (
        <p className="text-xs text-text-disabled text-center -mt-2">
          Select an activity level to continue
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack} fullWidth>
          Back
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={!level}
          onClick={handleNext}
          fullWidth
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
