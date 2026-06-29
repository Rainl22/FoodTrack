'use client';

import { forwardRef, useId } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  [
    'w-full bg-surface-input rounded-input px-4',
    'text-text-primary placeholder:text-text-disabled',
    'transition-[box-shadow,border-color] duration-[150ms] ease-in-out',
    'focus:outline-none focus:ring-2 focus:ring-brand-500',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ],
  {
    variants: {
      size: {
        sm: 'h-9 text-sm',
        md: 'h-11 text-base',  // 44px tap target
        lg: 'h-12 text-lg',
      },
      hasError: {
        true:  'ring-2 ring-error focus:ring-error',
        false: '',
      },
    },
    defaultVariants: {
      size:     'md',
      hasError: false,
    },
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?:  string;
  error?:  string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, hasError, label, error, helper, id: idProp, ...props }, ref) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-text-primary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(inputVariants({ size, hasError: !!error || !!hasError }), className)}
          aria-invalid={!!error}
          aria-describedby={error || helper ? `${id}-hint` : undefined}
          {...props}
        />
        {(error || helper) && (
          <p
            id={`${id}-hint`}
            className={cn('text-xs', error ? 'text-error' : 'text-text-secondary')}
          >
            {error ?? helper}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';
