'use client';

import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // base
  [
    'inline-flex items-center justify-center font-semibold rounded-btn',
    'transition-colors duration-[150ms] ease-in-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-cta text-text-inverse hover:bg-cta-hover active:bg-cta-hover',
        secondary:
          'border border-brand-500 text-brand-500 bg-transparent hover:bg-brand-50 active:bg-brand-100',
        ghost:
          'text-text-primary bg-transparent hover:bg-surface-active active:bg-surface-active',
        danger: 'bg-error text-text-inverse hover:bg-red-600 active:bg-red-700',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-base',   // 44px — minimum tap target
        lg: 'h-12 px-6 text-lg',     // 48px — recommended tap target
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export { buttonVariants };
