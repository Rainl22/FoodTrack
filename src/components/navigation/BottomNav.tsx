'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// ─── Inline SVG icons (no external icon dep required) ────────────────────────

function IconHome({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden fill="none" strokeWidth={active ? 2.5 : 1.8} stroke="currentColor">
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCalendar({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden fill="none" strokeWidth={active ? 2.5 : 1.8} stroke="currentColor">
      <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" y1="9" x2="21" y2="9" strokeLinecap="round" />
      <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden fill="none" strokeWidth={2.5} stroke="currentColor">
      <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
    </svg>
  );
}

function IconChart({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden fill="none" strokeWidth={active ? 2.5 : 1.8} stroke="currentColor">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPerson({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden fill="none" strokeWidth={active ? 2.5 : 1.8} stroke="currentColor">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '/today',    label: 'Today',    Icon: IconHome    },
  { href: '/week',     label: 'Week',     Icon: IconCalendar },
  { href: '/log',      label: 'Log',      Icon: null        },  // FAB slot
  { href: '/insights', label: 'Insights', Icon: IconChart   },
  { href: '/profile',  label: 'Profile',  Icon: IconPerson  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[40]',
        'bg-surface-card border-t border-surface-input',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <ul className="flex items-stretch h-[68px]">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');

          // Log tab — FAB style
          if (Icon === null) {
            return (
              <li key={href} className="flex-1 flex items-center justify-center">
                <Link
                  href={href}
                  aria-label="Log meal"
                  className={cn(
                    'flex items-center justify-center',
                    'h-12 w-12 rounded-full bg-cta shadow-md',
                    'text-text-inverse',
                    'transition-transform duration-[100ms] active:scale-95',
                  )}
                >
                  <IconPlus />
                </Link>
              </li>
            );
          }

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 h-full',
                  'transition-colors duration-[100ms]',
                  active
                    ? 'text-brand-500'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                <Icon active={active} />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
