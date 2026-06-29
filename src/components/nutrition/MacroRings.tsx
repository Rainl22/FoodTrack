'use client';

import { Ring } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { MacroTotals, MacroTargets } from '@/types';

interface MacroRingsProps {
  totals:    MacroTotals;
  targets:   MacroTargets;
  size?:     number;
  className?: string;
}

function pct(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}

const MACROS = [
  {
    key:      'protein',
    label:    'Protein',
    color:    'text-macro-protein',
    getValue: (t: MacroTotals) => t.proteinTotalG,
    getTarget:(t: MacroTargets) => t.proteinTargetG,
  },
  {
    key:      'carbs',
    label:    'Carbs',
    color:    'text-macro-carbs',
    getValue: (t: MacroTotals) => t.carbsTotalG,
    getTarget:(t: MacroTargets) => t.carbsTargetG,
  },
  {
    key:      'fat',
    label:    'Fat',
    color:    'text-macro-fat',
    getValue: (t: MacroTotals) => t.fatTotalG,
    getTarget:(t: MacroTargets) => t.fatTargetG,
  },
] as const;

export function MacroRings({ totals, targets, size = 88, className }: MacroRingsProps) {
  return (
    <div className={cn('flex justify-around', className)}>
      {MACROS.map(({ key, label, color, getValue, getTarget }) => {
        const value  = getValue(totals);
        const target = getTarget(targets);
        const progress = pct(value, target);
        return (
          <div key={key} className="flex flex-col items-center gap-1.5">
            <Ring value={progress} size={size} strokeWidth={8} className={color}>
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold text-text-primary leading-none">
                  {Math.round(value)}
                </span>
                <span className="text-[10px] text-text-secondary">g</span>
              </div>
            </Ring>
            <div className="text-center">
              <p className="text-xs font-medium text-text-secondary">{label}</p>
              <p className="text-[10px] text-text-disabled">/ {target}g</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
