/**
 * In-memory IDayRepository implementation for tests and Storybook.
 * Not used in production — production uses FirestoreDayRepository.
 */

import type { IDayRepository } from '@/repositories';
import type { DayAggregate, DayActivity, MacroTotals } from '@/types/nutrition';
import type { MacroTargets } from '@/types/user';
import { adjustTargetsForTraining } from '@/lib/nutrition/adjust';

export class MockDayRepository implements IDayRepository {
  private store = new Map<string, DayAggregate>();

  /** Seed the store for tests. */
  seed(uid: string, days: DayAggregate[]): void {
    for (const day of days) {
      this.store.set(`${uid}:${day.date}`, day);
    }
  }

  clear(): void {
    this.store.clear();
  }

  async get(uid: string, date: string): Promise<DayAggregate | null> {
    return this.store.get(`${uid}:${date}`) ?? null;
  }

  async getRange(uid: string, from: string, to: string): Promise<DayAggregate[]> {
    const results: DayAggregate[] = [];
    for (const [key, day] of this.store.entries()) {
      if (key.startsWith(`${uid}:`) && day.date >= from && day.date <= to) {
        results.push(day);
      }
    }
    return results.sort((a, b) => a.date.localeCompare(b.date));
  }

  async recompute(uid: string, date: string): Promise<DayAggregate> {
    // In tests, callers may have already seeded totals; recompute is a no-op here
    // unless overridden by a specific test. For full recompute tests, use the
    // real FirestoreDayRepository against the emulator.
    const existing = this.store.get(`${uid}:${date}`);
    const totals: MacroTotals = existing?.totals ?? {
      calorieTotal: 0, proteinTotalG: 0, carbsTotalG: 0, fatTotalG: 0,
    };
    const day: DayAggregate = {
      date,
      totals,
      adjustedTargets: existing?.adjustedTargets,
      activity:        existing?.activity,
      lastComputedAt:  new Date().toISOString(),
    };
    this.store.set(`${uid}:${date}`, day);
    return day;
  }

  async setActivity(
    uid: string,
    date: string,
    activity: DayActivity,
    baselineTargets?: MacroTargets,
  ): Promise<DayAggregate> {
    const existing = await this.get(uid, date);
    const adjustedTargets = baselineTargets
      ? adjustTargetsForTraining(baselineTargets, activity)
      : undefined;

    const day: DayAggregate = {
      date,
      totals:          existing?.totals ?? { calorieTotal: 0, proteinTotalG: 0, carbsTotalG: 0, fatTotalG: 0 },
      activity,
      adjustedTargets,
      lastComputedAt:  new Date().toISOString(),
    };
    this.store.set(`${uid}:${date}`, day);
    return day;
  }
}
