'use client';

import { useEffect, useState } from 'react';
import { dayRepository } from '@/lib/firestore';
import { useUserStore } from '@/store/useUserStore';
import type { DayAggregate } from '@/types';

function getLast7Days(): { from: string; to: string } {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 6);
  const toISO = today.toISOString().slice(0, 10);
  const fromISO = from.toISOString().slice(0, 10);
  return { from: fromISO, to: toISO };
}

export function useWeekData() {
  const uid = useUserStore((s) => s.user?.uid);
  const [days, setDays] = useState<DayAggregate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const { from, to } = getLast7Days();
    setIsLoading(true);
    setError(null);
    dayRepository
      .getRange(uid, from, to)
      .then(setDays)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Failed to load week data'),
      )
      .finally(() => setIsLoading(false));
  }, [uid]);

  return { days, isLoading, error };
}
