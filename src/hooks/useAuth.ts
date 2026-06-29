'use client';

import { useEffect } from 'react';
import { subscribeToAuthState } from '@/lib/firebase/auth';
import { useUserStore } from '@/store/useUserStore';

/**
 * Subscribe to Firebase auth state.
 * Call once at the app root (layout or AuthProvider).
 * Populates useUserStore on sign-in; clears it on sign-out.
 */
export function useAuth(): void {
  const setStatus = useUserStore((s) => s.setStatus);
  const setUser   = useUserStore((s) => s.setUser);
  const clear     = useUserStore((s) => s.clear);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      if (user) {
        setUser(user);
        setStatus('authenticated');
      } else {
        clear();
      }
    });
    return unsubscribe;
  }, [setStatus, setUser, clear]);
}
