'use client';

import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { DayActivity, AdjustedTargets } from '@/types';

interface TrainingBannerProps {
  activity:        DayActivity;
  adjustedTargets: AdjustedTargets;
  className?:      string;
}

const TYPE_LABELS = {
  strength: 'Strength',
  cardio:   'Cardio',
  mixed:    'Mixed',
  rest:     'Rest',
} as const;

export function TrainingBanner({ activity, adjustedTargets, className }: TrainingBannerProps) {
  const typeLabel = activity.trainingType ? TYPE_LABELS[activity.trainingType] : 'Training';

  return (
    <Card padding="sm" className={cn('border border-brand-200 bg-brand-50', className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text-primary">
            {typeLabel} day
          </p>
          <p className="text-xs text-text-secondary mt-0.5">
            {activity.totalDurationMin}min
            {activity.steps > 0 && ` · ${activity.steps.toLocaleString()} steps`}
            {activity.activeCaloriesKcal > 0 && ` · ${Math.round(activity.activeCaloriesKcal)} kcal burned`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-text-secondary uppercase tracking-wide">Adjusted target</p>
          <p className="text-base font-bold text-brand-500">
            {adjustedTargets.adjustedCalorieTarget} kcal
          </p>
        </div>
      </div>
    </Card>
  );
}
