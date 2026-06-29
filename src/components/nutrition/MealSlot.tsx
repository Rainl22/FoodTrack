'use client';

import { Card } from '@/components/ui';
import { FoodItemRow } from './FoodItemRow';
import { cn } from '@/lib/utils';
import type { Entry, MealSlot as MealSlotType } from '@/types';

interface MealSlotProps {
  slot:         MealSlotType;
  entries:      Entry[];
  onAdd:        (slot: MealSlotType) => void;
  onEdit?:      (entryId: string, date: string) => void;
  onDelete?:    (entryId: string, date: string) => void;
  className?:   string;
}

const SLOT_LABELS: Record<MealSlotType, string> = {
  breakfast: 'Breakfast',
  lunch:     'Lunch',
  dinner:    'Dinner',
  snacks:    'Snacks',
};

export function MealSlot({ slot, entries, onAdd, onEdit, onDelete, className }: MealSlotProps) {
  const slotCalories = entries.reduce((sum, e) => sum + e.totalCalories, 0);

  return (
    <Card padding="md" className={cn('', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-text-primary">
          {SLOT_LABELS[slot]}
        </span>
        {entries.length > 0 && (
          <span className="text-xs text-text-secondary">
            {Math.round(slotCalories)} kcal
          </span>
        )}
      </div>

      {entries.length > 0 ? (
        <div className="divide-y divide-surface-input">
          {entries.map((entry) => (
            <FoodItemRow
              key={entry.id}
              entry={entry}
              onEdit={onEdit ? () => onEdit(entry.id, entry.date) : undefined}
              onDelete={onDelete ? () => onDelete(entry.id, entry.date) : undefined}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-disabled py-1">No food logged yet</p>
      )}

      <button
        type="button"
        onClick={() => onAdd(slot)}
        className="mt-3 flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors"
      >
        <span aria-hidden="true">+</span>
        Add food
      </button>
    </Card>
  );
}
