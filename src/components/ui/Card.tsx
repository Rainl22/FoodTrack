import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva('bg-surface-card rounded-card', {
  variants: {
    padding: {
      none: '',
      sm:   'p-3',
      md:   'p-4',
      lg:   'p-6',
    },
    shadow: {
      none:    '',
      sm:      'shadow-sm',
      default: 'shadow-card',
      md:      'shadow-md',
    },
  },
  defaultVariants: {
    padding: 'md',
    shadow:  'default',
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding, shadow, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ padding, shadow }), className)} {...props} />
  ),
);
Card.displayName = 'Card';
