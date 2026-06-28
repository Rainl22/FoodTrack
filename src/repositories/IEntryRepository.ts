import type { Entry, MealSlot, EntryType } from '@/types/nutrition';
import type { CreateEntryInput } from '@/lib/validation/nutrition';

export interface EntryQuery {
  date?: string;                // filter by exact date (YYYY-MM-DD)
  dateRange?: { from: string; to: string }; // inclusive range
  slot?: MealSlot;
  type?: EntryType;
  limit?: number;
}

/**
 * Contract for entry persistence.
 * Entries are the source of truth for all nutrition data.
 *
 * Any mutation that changes totals for a date MUST trigger DayRepository.recompute().
 * This is enforced by the Firestore implementation — callers don't need to know.
 */
export interface IEntryRepository {
  /**
   * Get a single entry by ID.
   */
  getById(uid: string, entryId: string): Promise<Entry | null>;

  /**
   * List entries matching a query. Most common call is { date: 'YYYY-MM-DD' }.
   */
  list(uid: string, query: EntryQuery): Promise<Entry[]>;

  /**
   * Create a new entry. Returns the created entry with its assigned id and timestamps.
   * Automatically recomputes the day aggregate for entry.date.
   */
  create(uid: string, input: CreateEntryInput): Promise<Entry>;

  /**
   * Update fields on an existing entry.
   * If items change, totals are recomputed from items before saving.
   * Automatically recomputes the day aggregate for the entry's date.
   */
  update(uid: string, entryId: string, patch: Partial<Entry>): Promise<Entry>;

  /**
   * Delete an entry.
   * Automatically recomputes the day aggregate for the entry's date.
   */
  delete(uid: string, entryId: string): Promise<void>;

  /**
   * Copy all entries from one (date, slot) to another.
   * Creates new entries with a new timestamp — does not modify originals.
   */
  copySlot(
    uid: string,
    from: { date: string; slot: MealSlot },
    to: { date: string; slot: MealSlot },
  ): Promise<Entry[]>;
}
