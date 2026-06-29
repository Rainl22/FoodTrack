'use client';

import { useEffect } from 'react';
import { entryRepository, dayRepository } from '@/lib/firestore';
import { useUserStore } from '@/store/useUserStore';
import { useDayStore } from '@/store/useDayStore';

/**
 * Load entries and the day aggregate for the active date.
 * Re-fetches automatically when the user or active date changes.
 * State is written to useDayStore — read from there in components.
 */
export function useDayData(): void {
  const user       = useUserStore((s) => s.user);
  const activeDate = useDayStore((s) => s.activeDate);
  const setEntries = useDayStore((s) => s.setEntries);
  const setDay     = useDayStore((s) => s.setDay);
  const setLoading = useDayStore((s) => s.setLoading);
  const setError   = useDayStore((s) => s.setError);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setError(null);

    Promise.all([
      entryRepository.list(user.uid, { date: activeDate }),
      dayRepository.get(user.uid, activeDate),
    ])
      .then(([entries, day]) => {
        setEntries(entries);
        setDay(day);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load day data'))
      .finally(() => setLoading(false));
  }, [user?.uid, activeDate]);
}
