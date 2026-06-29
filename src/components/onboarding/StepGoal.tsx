'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Goal } from '@/types';

const GOALS: { value: Goal; label: string; description: string }[] = [
  { value: 'fat_loss',     label: 'Lose fat',        description: 'Calorie deficit with high protein' },
  { value: 'maintain',     label: 'Stay balanced',   description: 'Maintain current body composition' },
  { value: 'muscle_gain',  label: 'Build muscle',    description: 'Calorie surplus with high protein' },
];

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-brand-500">
      <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

interface StepGoalProps {
  defaultValue?: Goal;
  onNext: (data: { goal: Goal }) => void;
  onBack: () => void;
}

export function StepGoal({ defaultValue, onNext, onBack }: StepGoalProps) {
  const [goal, setGoal] = useState<Goal | undefined>(defaultValue);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Your goal</h2>
        <p className="text-sm text-text-secondary mt-1">This shapes your daily calorie and macro targets.</p>
      </div>

      <div className="flex flex-col gap-3">
        {GOALS.map((g) => (
          <button
            key={g.value}
            type="button"
            onClick={() => setGoal(g.value)}
            className={cn(
              'flex items-center gap-3 w-full px-5 py-4 rounded-card border transition-colors text-left',
              goal === g.value
                ? 'bg-brand-50 border-brand-500'
                : 'bg-surface-card border-surface-input hover:border-brand-300',
            )}
          >
            <div className="flex-1 flex flex-col gap-0.5">
              <span className={cn('text-base font-semibold', goal === g.value ? 'text-brand-600' : 'text-text-primary')}>
                {g.label}
              </span>
              <span className="text-sm text-text-secondary">{g.description}</span>
            </div>
            {goal === g.value && <CheckIcon />}
          </button>
        ))}
      </div>

      {!goal && (
        <p className="text-xs text-text-disabled text-center -mt-2">
          Select a goal to continue
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack} fullWidth>
          Back
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={!goal}
          onClick={() => goal && onNext({ goal })}
          fullWidth
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
