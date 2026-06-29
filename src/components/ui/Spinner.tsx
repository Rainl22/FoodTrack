import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const spinnerVariants = cva(
  'animate-spin rounded-full border-2 border-current border-t-transparent',
  {
    variants: {
      size: {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
        xl: 'h-12 w-12',
      },
      color: {
        brand: 'text-brand-500',
        white: 'text-white',
        muted: 'text-text-disabled',
      },
    },
    defaultVariants: {
      size:  'md',
      color: 'brand',
    },
  },
);

export interface SpinnerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof spinnerVariants> {}

export function Spinner({ className, size, color, ...props }: SpinnerProps) {
  return (
    <div role="status" aria-label="Loading" className={cn('inline-flex', className)} {...props}>
      <div className={spinnerVariants({ size, color })} />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
