'use client';

import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const chipVariants = cva(
  [
    'inline-flex items-center justify-center rounded-chip font-medium',
    'transition-colors duration-[150ms] ease-in-out',
    'cursor-pointer select-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
  ],
  {
    variants: {
      size: {
        sm: 'h-7 px-3 text-xs',
        md: 'h-8 px-4 text-sm',
        lg: 'h-9 px-5 text-sm',
      },
      selected: {
        true:  'bg-brand-500 text-text-inverse',
        false: 'bg-surface-input text-text-secondary hover:bg-surface-active',
      },
    },
    defaultVariants: {
      size:     'md',
      selected: false,
    },
  },
);

export interface ChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof chipVariants> {
  selected?: boolean;
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, size, selected, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(chipVariants({ size, selected }), className)}
      aria-pressed={selected ?? undefined}
      {...props}
    />
  ),
);
Chip.displayName = 'Chip';
