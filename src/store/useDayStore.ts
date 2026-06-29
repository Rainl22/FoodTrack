import { create } from 'zustand';
import type { Entry, DayAggregate } from '@/types';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface DayState {
  activeDate: string;       // YYYY-MM-DD — the day currently displayed/edited
  entries:    Entry[];
  day:        DayAggregate | null;
  isLoading:  boolean;
  error:      string | null;

  setActiveDate: (date: string)              => void;
  setEntries:    (entries: Entry[])          => void;
  setDay:        (day: DayAggregate | null)  => void;
  setLoading:    (loading: boolean)          => void;
  setError:      (error: string | null)      => void;
}

export const useDayStore = create<DayState>((set) => ({
  activeDate: todayISO(),
  entries:    [],
  day:        null,
  isLoading:  false,
  error:      null,

  setActiveDate: (activeDate) => set({ activeDate }),
  setEntries:    (entries)    => set({ entries }),
  setDay:        (day)        => set({ day }),
  setLoading:    (isLoading)  => set({ isLoading }),
  setError:      (error)      => set({ error }),
}));
