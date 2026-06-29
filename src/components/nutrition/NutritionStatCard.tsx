'use client';

import { Card, ProgressBar } from '@/components/ui';
import { cn } from '@/lib/utils';

interface NutritionStatCardProps {
  label:      string;
  value:      number;
  unit?:      string;
  target?:    number;
  color?:     string;
  className?: string;
}

export function NutritionStatCard({
  label,
  value,
  unit,
  target,
  color = 'bg-brand-500',
  className,
}: NutritionStatCardProps) {
  const pct = target && target > 0
    ? Math.min(100, Math.round((value / target) * 100))
    : undefined;

  return (
    <Card padding="md" className={cn('', className)}>
      <p className="text-xs text-text-secondary uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-text-primary tabular-nums">
          {Number.isInteger(value) ? value : value.toFixed(1)}
        </span>
        {unit && <span className="text-sm text-text-secondary">{unit}</span>}
      </div>
      {pct !== undefined && (
        <ProgressBar value={pct} color={color} className="mt-2" aria-label={`${pct}% of target`} />
      )}
    </Card>
  );
}
