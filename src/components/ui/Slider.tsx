'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:        string;
  showValue?:    boolean;
  formatValue?:  (v: number) => string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ label, showValue = false, formatValue, className, value, onChange, ...props }, ref) => {
    const display = formatValue
      ? formatValue(Number(value))
      : value !== undefined
      ? String(value)
      : '';

    return (
      <div className="flex flex-col gap-2">
        {(label || showValue) && (
          <div className="flex items-center justify-between">
            {label && (
              <span className="text-sm font-medium text-text-primary">{label}</span>
            )}
            {showValue && (
              <span className="text-sm font-semibold text-brand-500">{display}</span>
            )}
          </div>
        )}
        <input
          ref={ref}
          type="range"
          value={value}
          onChange={onChange}
          className={cn(
            'w-full h-1.5 rounded-full appearance-none cursor-pointer',
            'bg-surface-input accent-brand-500',
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
Slider.displayName = 'Slider';
