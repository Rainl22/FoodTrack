import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const trackVariants = cva('w-full rounded-full bg-surface-input overflow-hidden', {
  variants: {
    size: {
      sm: 'h-1.5',
      md: 'h-2',
      lg: 'h-3',
    },
  },
  defaultVariants: { size: 'md' },
});

export interface ProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof trackVariants> {
  value:     number;   // current value
  max?:      number;   // default 100
  color?:    string;   // Tailwind bg-* class e.g. 'bg-brand-500'
  animated?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  color = 'bg-brand-500',
  size,
  animated = false,
  className,
  ...props
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
      aria-valuemin={0}
      className={cn(trackVariants({ size }), className)}
      {...props}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-[350ms] ease-in-out',
          color,
          animated && 'animate-pulse',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
