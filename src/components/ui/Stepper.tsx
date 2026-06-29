import { cn } from '@/lib/utils';

export interface StepperProps {
  steps:      number;
  current:    number;   // 0-indexed
  className?: string;
}

export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="list"
      aria-label={`Step ${current + 1} of ${steps}`}
    >
      {Array.from({ length: steps }, (_, i) => {
        const isPast    = i < current;
        const isCurrent = i === current;

        return (
          <div
            key={i}
            role="listitem"
            aria-label={`Step ${i + 1}${isCurrent ? ' (current)' : isPast ? ' (complete)' : ''}`}
            className={cn(
              'h-2 rounded-full transition-all duration-[250ms] ease-in-out',
              isCurrent ? 'w-6 bg-brand-500' : '',
              isPast    ? 'w-2 bg-brand-300' : '',
              !isCurrent && !isPast ? 'w-2 bg-surface-input' : '',
            )}
          />
        );
      })}
    </div>
  );
}
