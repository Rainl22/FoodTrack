import { cn } from '@/lib/utils';

export interface RingProps {
  /** Progress value 0–100 */
  value:        number;
  size?:        number;   // px diameter; default 80
  strokeWidth?: number;   // default 8
  color?:       string;   // CSS color; default brand teal
  trackColor?:  string;   // CSS color; default surface-input
  className?:   string;
  children?:    React.ReactNode;
}

export function Ring({
  value,
  size        = 80,
  strokeWidth = 8,
  color       = '#1aa8a1',
  trackColor  = '#F0F0F5',
  className,
  children,
}: RingProps) {
  const r            = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped      = Math.min(100, Math.max(0, value));
  const offset       = circumference - (clamped / 100) * circumference;
  const center       = size / 2;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {/* SVG is rotated so the arc starts at 12 o'clock */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Fill */}
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-[350ms] ease-in-out"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
