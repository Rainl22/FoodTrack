'use client';

import { ProgressBar } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { MacroTotals, MacroTargets } from '@/types';

interface CalorieSummaryProps {
  totals:    MacroTotals;
  targets:   MacroTargets;
  className?: string;
}

export function CalorieSummary({ totals, targets, className }: CalorieSummaryProps) {
  const eaten    = Math.round(totals.calorieTotal);
  const target   = targets.calorieTarget;
  const remaining = Math.max(0, target - eaten);
  const pct      = target > 0 ? Math.min(100, Math.round((eaten / target) * 100)) : 0;
  const over      = eaten > target;

  return (
    <div className={cn('text-center', className)}>
      <div className="flex items-baseline justify-center gap-1 mb-1">
        <span className="text-4xl font-bold text-text-primary tabular-nums">{eaten}</span>
        <span className="text-base text-text-secondary">/ {target} kcal</span>
      </div>
      <p className={cn('text-sm mb-3', over ? 'text-error' : 'text-text-secondary')}>
        {over
          ? `${eaten - target} over goal`
          : `${remaining} kcal remaining`}
      </p>
      <ProgressBar
        value={pct}
        color={over ? 'bg-error' : 'bg-brand-500'}
        aria-label={`${pct}% of calorie goal`}
      />
    </div>
  );
}
