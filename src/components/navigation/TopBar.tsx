import { cn } from '@/lib/utils';

export interface TopBarProps {
  title?:     React.ReactNode;
  left?:      React.ReactNode;
  right?:     React.ReactNode;
  className?: string;
  /** When true, the TopBar scrolls with the page instead of sticking to the top */
  static?:    boolean;
}

/**
 * App top bar. Fixed by default; pass `static` to let it flow with content.
 * `left` / `right` accept any React node (icon buttons, avatar, text).
 * When fixed, pages must add `pt-[56px]` (or `pt-topbar-height`) to their
 * first content block so content isn't hidden underneath.
 */
export function TopBar({ title, left, right, className, static: isStatic }: TopBarProps) {
  return (
    <header
      className={cn(
        'flex items-center h-[56px] px-4 bg-surface-card border-b border-surface-input z-[40]',
        !isStatic && 'fixed top-0 left-0 right-0 pt-[env(safe-area-inset-top)]',
        className,
      )}
    >
      {/* Left slot */}
      <div className="w-10 flex items-center">{left}</div>

      {/* Title — centred between the two fixed-width slots */}
      <div className="flex-1 flex items-center justify-center px-2">
        {typeof title === 'string' ? (
          <h1 className="text-lg font-semibold text-text-primary truncate">{title}</h1>
        ) : (
          title
        )}
      </div>

      {/* Right slot */}
      <div className="w-10 flex items-center justify-end">{right}</div>
    </header>
  );
}
