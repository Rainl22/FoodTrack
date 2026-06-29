'use client';

import { useState } from 'react';
import { Button, Card, Chip } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { MealAnalysisServiceResult } from '@/lib/ai/service';
import type { MealSlot } from '@/types';

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch:     'Lunch',
  dinner:    'Dinner',
  snacks:    'Snacks',
};

interface MealConfirmCardProps {
  result:       MealAnalysisServiceResult;
  onConfirm:    (slot: MealSlot | undefined) => void;
  onDiscard:    () => void;
  isSaving?:    boolean;
  initialSlot?: MealSlot;
  editMode?:    boolean;
}

export function MealConfirmCard({
  result,
  onConfirm,
  onDiscard,
  isSaving = false,
  initialSlot,
  editMode = false,
}: MealConfirmCardProps) {
  const [selectedSlot, setSelectedSlot] = useState<MealSlot | undefined>(initialSlot);

  const totalCalories = result.items.reduce((s, i) => s + i.calories, 0);
  const totalProtein  = result.items.reduce((s, i) => s + i.proteinG, 0);
  const totalCarbs    = result.items.reduce((s, i) => s + i.carbsG, 0);
  const totalFat      = result.items.reduce((s, i) => s + i.fatG, 0);

  return (
    <div className="flex flex-col gap-4">
      <Card padding="md">
        <h3 className="text-base font-semibold text-text-primary mb-3">{result.name}</h3>

        <div className="flex flex-col gap-2 mb-4">
          {result.items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{item.name}</p>
                <p className="text-xs text-text-secondary">{item.portionDescription}</p>
              </div>
              <p className="text-sm text-text-secondary shrink-0">
                {Math.round(item.calories)} kcal
              </p>
            </div>
          ))}
        </div>

        <div className="border-t border-surface-input pt-3">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-text-primary">Total</span>
            <span className="font-bold text-text-primary">{Math.round(totalCalories)} kcal</span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            P {Math.round(totalProtein)}g
            {' · '}C {Math.round(totalCarbs)}g
            {' · '}F {Math.round(totalFat)}g
          </p>
        </div>

        {result.aiMeta.notes && (
          <p className={cn(
            'mt-3 text-xs text-text-secondary italic',
            result.aiMeta.confidence === 'low' && 'text-warning',
          )}>
            {result.aiMeta.notes}
          </p>
        )}
      </Card>

      <div>
        <p className="text-sm font-medium text-text-primary mb-2">{editMode ? 'Meal slot' : 'Log to meal'}</p>
        <div className="flex gap-2 flex-wrap">
          {SLOTS.map((slot) => (
            <Chip
              key={slot}
              selected={selectedSlot === slot}
              onClick={() => setSelectedSlot(s => s === slot ? undefined : slot)}
            >
              {SLOT_LABELS[slot]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          variant="primary"
          onClick={() => onConfirm(selectedSlot)}
          disabled={isSaving}
          fullWidth
        >
          {isSaving ? 'Saving…' : editMode ? 'Save changes' : 'Log this meal'}
        </Button>
        <Button variant="ghost" onClick={onDiscard} disabled={isSaving} fullWidth>
          {editMode ? 'Discard changes' : 'Try again'}
        </Button>
      </div>
    </div>
  );
}
