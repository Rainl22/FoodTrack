'use client';

import { useAuth } from '@/hooks/useAuth';

/**
 * Client boundary that bootstraps app-wide hooks.
 * Wrap the root layout body with this so hooks can subscribe to Firebase
 * auth state from the very first render.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  useAuth();
  return <>{children}</>;
}
