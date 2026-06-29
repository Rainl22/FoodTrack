'use client';

import { cn } from '@/lib/utils';
import type { DayAggregate } from '@/types';

interface DayTileProps {
  date:      string;        // YYYY-MM-DD
  day?:      DayAggregate;
  isActive:  boolean;
  onClick:   () => void;
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function DayTile({ date, day, isActive, onClick }: DayTileProps) {
  const d       = new Date(date + 'T12:00:00');
  const dayLabel = DAY_LABELS[d.getDay()];
  const dayNum   = d.getDate();
  const hasData  = day && day.totals.calorieTotal > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'date' : undefined}
      className={cn(
        'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors min-w-[48px]',
        isActive
          ? 'bg-brand-500 text-white'
          : 'text-text-secondary hover:bg-surface-input',
      )}
    >
      <span className="text-[11px] font-medium">{dayLabel}</span>
      <span className="text-sm font-bold">{dayNum}</span>
      <div
        className={cn(
          'h-1 w-1 rounded-full',
          hasData
            ? isActive ? 'bg-white/70' : 'bg-brand-400'
            : 'bg-transparent',
        )}
      />
    </button>
  );
}
