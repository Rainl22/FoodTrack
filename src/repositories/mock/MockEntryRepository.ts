/**
 * In-memory IEntryRepository implementation for tests and Storybook.
 */

import type { IEntryRepository, EntryQuery, IDayRepository } from '@/repositories';
import type { Entry, MealSlot } from '@/types/nutrition';
import type { CreateEntryInput } from '@/lib/validation/nutrition';
import { sumItems } from '@/lib/nutrition/totals';

let idCounter = 1;

export class MockEntryRepository implements IEntryRepository {
  private store = new Map<string, Entry>();

  constructor(private readonly dayRepo?: IDayRepository) {}

  seed(entries: Entry[]): void {
    for (const e of entries) this.store.set(e.id, e);
  }

  clear(): void {
    this.store.clear();
    idCounter = 1;
  }

  async getById(_uid: string, entryId: string): Promise<Entry | null> {
    return this.store.get(entryId) ?? null;
  }

  async list(_uid: string, q: EntryQuery): Promise<Entry[]> {
    let entries = Array.from(this.store.values());

    if (q.date)       entries = entries.filter(e => e.date === q.date);
    if (q.dateRange)  entries = entries.filter(e => e.date >= q.dateRange!.from && e.date <= q.dateRange!.to);
    if (q.slot)       entries = entries.filter(e => e.slot === q.slot);
    if (q.type)       entries = entries.filter(e => e.type === q.type);

    entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    if (q.limit) entries = entries.slice(0, q.limit);
    return entries;
  }

  async create(uid: string, input: CreateEntryInput): Promise<Entry> {
    const now = new Date().toISOString();
    const totals = sumItems(input.items);
    const entry: Entry = {
      ...input,
      id:             String(idCounter++),
      totalCalories:  totals.calorieTotal,
      totalProteinG:  totals.proteinTotalG,
      totalCarbsG:    totals.carbsTotalG,
      totalFatG:      totals.fatTotalG,
      createdAt:      now,
      updatedAt:      now,
    };
    this.store.set(entry.id, entry);
    await this.dayRepo?.recompute(uid, entry.date);
    return entry;
  }

  async update(uid: string, entryId: string, patch: Partial<Entry>): Promise<Entry> {
    const existing = this.store.get(entryId);
    if (!existing) throw new Error(`Entry ${entryId} not found`);

    const updatedItems = patch.items ?? existing.items;
    const totals = sumItems(updatedItems);
    const updated: Entry = {
      ...existing,
      ...patch,
      totalCalories:  totals.calorieTotal,
      totalProteinG:  totals.proteinTotalG,
      totalCarbsG:    totals.carbsTotalG,
      totalFatG:      totals.fatTotalG,
      updatedAt:      new Date().toISOString(),
    };
    this.store.set(entryId, updated);
    await this.dayRepo?.recompute(uid, updated.date);
    if (patch.date && patch.date !== existing.date) {
      await this.dayRepo?.recompute(uid, existing.date);
    }
    return updated;
  }

  async delete(uid: string, entryId: string): Promise<void> {
    const existing = this.store.get(entryId);
    if (!existing) return;
    this.store.delete(entryId);
    await this.dayRepo?.recompute(uid, existing.date);
  }

  async copySlot(
    uid: string,
    from: { date: string; slot: MealSlot },
    to: { date: string; slot: MealSlot },
  ): Promise<Entry[]> {
    const source = await this.list(uid, { date: from.date, slot: from.slot });
    const now = new Date().toISOString();
    const copies: Entry[] = [];

    for (const entry of source) {
      const copy: Entry = {
        ...entry,
        id:        String(idCounter++),
        date:      to.date,
        slot:      to.slot,
        timestamp: now,
        createdAt: now,
        updatedAt: now,
      };
      this.store.set(copy.id, copy);
      copies.push(copy);
    }

    await this.dayRepo?.recompute(uid, to.date);
    return copies;
  }
}
