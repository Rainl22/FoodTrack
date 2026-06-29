import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const toastVariants = cva(
  [
    'flex items-start gap-3 rounded-lg px-4 py-3 shadow-md',
    'text-sm font-medium text-text-primary bg-surface-card',
    'border-l-4',
  ],
  {
    variants: {
      severity: {
        info:    'border-l-info',
        success: 'border-l-success',
        warning: 'border-l-warning',
        error:   'border-l-error',
      },
    },
    defaultVariants: { severity: 'info' },
  },
);

export interface ToastProps extends VariantProps<typeof toastVariants> {
  message:    string;
  onDismiss?: () => void;
  className?: string;
}

export function Toast({ severity, message, onDismiss, className }: ToastProps) {
  return (
    <div role="alert" className={cn(toastVariants({ severity }), className)}>
      <span className="flex-1 leading-snug">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-text-secondary hover:text-text-primary transition-colors duration-[100ms] mt-0.5 leading-none"
          aria-label="Dismiss notification"
        >
          &#x2715;
        </button>
      )}
    </div>
  );
}
