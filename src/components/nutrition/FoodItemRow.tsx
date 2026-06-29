'use client';

import { cn } from '@/lib/utils';
import type { Entry } from '@/types';

interface FoodItemRowProps {
  entry:      Entry;
  onDelete?:  () => void;
  className?: string;
}

export function FoodItemRow({ entry, onDelete, className }: FoodItemRowProps) {
  return (
    <div className={cn('flex items-center gap-3 py-2.5', className)}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{entry.name}</p>
        <p className="text-xs text-text-secondary mt-0.5">
          {Math.round(entry.totalCalories)} kcal
          {' · '}P {Math.round(entry.totalProteinG)}g
          {' · '}C {Math.round(entry.totalCarbsG)}g
          {' · '}F {Math.round(entry.totalFatG)}g
        </p>
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Remove ${entry.name}`}
          className="shrink-0 p-1.5 text-text-disabled hover:text-error transition-colors rounded"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 4h12M5 4V2.5A1.5 1.5 0 016.5 1h3A1.5 1.5 0 0111 2.5V4m2 0v9a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 013 13V4h10z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}
