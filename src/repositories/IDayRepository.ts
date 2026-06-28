import type { DayAggregate, DayActivity } from '@/types/nutrition';
import type { MacroTargets } from '@/types/user';

/**
 * Contract for day aggregate persistence.
 *
 * IMPORTANT: Day aggregates are a maintained cache, not source of truth.
 * - Never call `save()` directly from UI code — only EntryRepository calls it.
 * - `recompute()` queries all entries for a date and derives the totals.
 * - `get()` / `getRange()` are read-only for UI consumers.
 */
export interface IDayRepository {
  /**
   * Get the day aggregate for a specific date.
   * Returns null if no entries have been logged for that date.
   */
  get(uid: string, date: string): Promise<DayAggregate | null>;

  /**
   * Get day aggregates for a date range (inclusive).
   * Used by the week strip to load 7 days in one query.
   */
  getRange(uid: string, from: string, to: string): Promise<DayAggregate[]>;

  /**
   * Recompute totals from all entries for a given date and persist.
   * Called automatically by EntryRepository after any entry mutation.
   * Also exposed here for explicit sync/repair use cases.
   */
  recompute(uid: string, date: string): Promise<DayAggregate>;

  /**
   * Write wearable activity data to a day (called by Health Connect sync).
   * If baselineTargets are provided, adjusted targets are computed from the
   * activity and stored alongside the activity data.
   */
  setActivity(
    uid: string,
    date: string,
    activity: DayActivity,
    baselineTargets?: MacroTargets,
  ): Promise<DayAggregate>;
}
