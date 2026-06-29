'use client';

import { useCallback } from 'react';
import { entryRepository, dayRepository } from '@/lib/firestore';
import { useUserStore } from '@/store/useUserStore';
import { useDayStore } from '@/store/useDayStore';
import type { CreateEntryInput } from '@/lib/validation/nutrition';
import type { Entry } from '@/types';

export function useEntryActions() {
  const uid       = useUserStore((s) => s.user?.uid);
  const activeDate = useDayStore((s) => s.activeDate);
  const setEntries = useDayStore((s) => s.setEntries);
  const setDay     = useDayStore((s) => s.setDay);

  const createEntry = useCallback(
    async (input: CreateEntryInput): Promise<Entry> => {
      if (!uid) throw new Error('Not authenticated');
      const entry = await entryRepository.create(uid, input);
      if (input.date === activeDate) {
        const [entries, day] = await Promise.all([
          entryRepository.list(uid, { date: activeDate }),
          dayRepository.get(uid, activeDate),
        ]);
        setEntries(entries);
        setDay(day);
      }
      return entry;
    },
    [uid, activeDate, setEntries, setDay],
  );

  const deleteEntry = useCallback(
    async (entryId: string, entryDate: string): Promise<void> => {
      if (!uid) throw new Error('Not authenticated');
      await entryRepository.delete(uid, entryId);
      if (entryDate === activeDate) {
        const [entries, day] = await Promise.all([
          entryRepository.list(uid, { date: activeDate }),
          dayRepository.get(uid, activeDate),
        ]);
        setEntries(entries);
        setDay(day);
      }
    },
    [uid, activeDate, setEntries, setDay],
  );

  return { createEntry, deleteEntry };
}
