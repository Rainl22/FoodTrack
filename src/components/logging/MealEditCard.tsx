'use client';

import { useState } from 'react';
import { Button, Card, Chip } from '@/components/ui';
import type { MealAnalysisServiceResult } from '@/lib/ai/service';
import type { FoodItem, MealSlot } from '@/types';

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch:     'Lunch',
  dinner:    'Dinner',
  snacks:    'Snacks',
};

// String-keyed so number inputs can hold intermediate states like "" or "1."
interface EditRow {
  name:      string;
  quantityG: string;
  calories:  string;
  proteinG:  string;
  carbsG:    string;
  fatG:      string;
}

const NUMERIC_FIELDS: Array<{ field: keyof Omit<EditRow, 'name'>; label: string }> = [
  { field: 'quantityG', label: 'g'    },
  { field: 'calories',  label: 'kcal' },
  { field: 'proteinG',  label: 'P g'  },
  { field: 'carbsG',    label: 'C g'  },
  { field: 'fatG',      label: 'F g'  },
];

function toRow(item: FoodItem): EditRow {
  const r = (n: number) => String(Math.round(n * 10) / 10);
  return {
    name:      item.name,
    quantityG: r(item.quantityG),
    calories:  String(Math.round(item.calories)),
    proteinG:  r(item.proteinG),
    carbsG:    r(item.carbsG),
    fatG:      r(item.fatG),
  };
}

function toFoodItem(row: EditRow): FoodItem {
  const qty = parseFloat(row.quantityG) || 0;
  return {
    name:               row.name.trim() || 'Item',
    portionDescription: qty > 0 ? `${qty}g` : 'custom',
    quantityG:          qty,
    calories:           parseFloat(row.calories)  || 0,
    proteinG:           parseFloat(row.proteinG)  || 0,
    carbsG:             parseFloat(row.carbsG)    || 0,
    fatG:               parseFloat(row.fatG)      || 0,
    confidence:         'medium',
  };
}

const BLANK_ROW: EditRow = {
  name: '', quantityG: '', calories: '', proteinG: '', carbsG: '', fatG: '',
};

interface MealEditCardProps {
  result:       MealAnalysisServiceResult;
  onConfirm:    (slot: MealSlot | undefined, items: FoodItem[]) => void;
  onDiscard:    () => void;
  isSaving?:    boolean;
  initialSlot?: MealSlot;
}

export function MealEditCard({
  result,
  onConfirm,
  onDiscard,
  isSaving = false,
  initialSlot,
}: MealEditCardProps) {
  const [rows, setRows]               = useState<EditRow[]>(() => result.items.map(toRow));
  const [selectedSlot, setSelectedSlot] = useState<MealSlot | undefined>(initialSlot);

  function updateRow(index: number, field: keyof EditRow, value: string) {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  }

  function removeRow(index: number) {
    setRows(prev => prev.filter((_, i) => i !== index));
  }

  function addRow() {
    setRows(prev => [...prev, { ...BLANK_ROW }]);
  }

  const totalCalories = rows.reduce((s, r) => s + (parseFloat(r.calories)  || 0), 0);
  const totalProtein  = rows.reduce((s, r) => s + (parseFloat(r.proteinG)  || 0), 0);
  const totalCarbs    = rows.reduce((s, r) => s + (parseFloat(r.carbsG)    || 0), 0);
  const totalFat      = rows.reduce((s, r) => s + (parseFloat(r.fatG)      || 0), 0);

  const hasItems = rows.some(r => r.name.trim().length > 0);

  function handleConfirm() {
    const items = rows.filter(r => r.name.trim()).map(toFoodItem);
    onConfirm(selectedSlot, items);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card padding="md">
        <div className="flex flex-col">
          {rows.map((row, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 py-3 border-b border-surface-input last:border-0"
            >
              {/* Name row */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={row.name}
                  onChange={e => updateRow(index, 'name', e.target.value)}
                  placeholder="Item name"
                  className="flex-1 text-sm font-medium bg-transparent border-b border-surface-input focus:border-brand-500 outline-none pb-0.5 text-text-primary placeholder:text-text-disabled"
                />
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  aria-label="Remove item"
                  className="shrink-0 p-1 text-text-disabled hover:text-error transition-colors rounded"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              {/* Numeric fields row */}
              <div className="grid grid-cols-5 gap-1.5">
                {NUMERIC_FIELDS.map(({ field, label }) => (
                  <div key={field} className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-disabled leading-none">{label}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={row[field]}
                      onChange={e => updateRow(index, field, e.target.value)}
                      placeholder="0"
                      className="w-full text-xs text-center bg-surface-input rounded px-1 py-1.5 outline-none focus:ring-1 focus:ring-brand-500 text-text-primary placeholder:text-text-disabled"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="mt-3 flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors"
        >
          <span aria-hidden="true">+</span>
          Add item
        </button>

        {/* Running totals */}
        <div className="border-t border-surface-input pt-3 mt-3">
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
      </Card>

      {/* Slot picker */}
      <div>
        <p className="text-sm font-medium text-text-primary mb-2">Meal slot</p>
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
          onClick={handleConfirm}
          disabled={isSaving || !hasItems}
          fullWidth
        >
          {isSaving ? 'Saving…' : 'Save changes'}
        </Button>
        <Button variant="ghost" onClick={onDiscard} disabled={isSaving} fullWidth>
          Discard changes
        </Button>
      </div>
    </div>
  );
}
