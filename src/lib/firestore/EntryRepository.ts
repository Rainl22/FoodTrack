import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { IEntryRepository, EntryQuery } from '@/repositories';
import type { IDayRepository } from '@/repositories';
import type { Entry, MealSlot, EntryType } from '@/types/nutrition';
import type { EntryDocument } from '@/types/firestore';
import type { CreateEntryInput } from '@/lib/validation/nutrition';
import { COLLECTIONS, ENTRY_FIELDS } from './schema';
import { toEntryDocument, fromEntryDocument } from './mappers';
import { sumItems } from '@/lib/nutrition/totals';

export class FirestoreEntryRepository implements IEntryRepository {
  constructor(
    private readonly db: Firestore,
    // DayRepository is injected so EntryRepository can trigger recompute
    private readonly dayRepo: IDayRepository,
  ) {}

  async getById(uid: string, entryId: string): Promise<Entry | null> {
    const snap = await getDoc(doc(this.db, COLLECTIONS.entry(uid, entryId)));
    if (!snap.exists()) return null;
    return fromEntryDocument(snap.data() as EntryDocument);
  }

  async list(uid: string, q: EntryQuery): Promise<Entry[]> {
    const constraints = [];

    if (q.date) {
      constraints.push(where(ENTRY_FIELDS.date, '==', q.date));
    } else if (q.dateRange) {
      constraints.push(where(ENTRY_FIELDS.date, '>=', q.dateRange.from));
      constraints.push(where(ENTRY_FIELDS.date, '<=', q.dateRange.to));
    }

    if (q.slot)  constraints.push(where(ENTRY_FIELDS.slot, '==', q.slot));
    if (q.type)  constraints.push(where(ENTRY_FIELDS.type, '==', q.type));

    constraints.push(orderBy(ENTRY_FIELDS.timestamp, 'asc'));
    if (q.limit) constraints.push(limit(q.limit));

    const colRef = collection(this.db, COLLECTIONS.entries(uid));
    const snap = await getDocs(query(colRef, ...constraints));
    return snap.docs.map(d => fromEntryDocument(d.data() as EntryDocument));
  }

  async create(uid: string, input: CreateEntryInput): Promise<Entry> {
    const now = new Date().toISOString();
    const entryRef = doc(collection(this.db, COLLECTIONS.entries(uid)));
    const totals = sumItems(input.items);

    const entry: Entry = {
      ...input,
      id:             entryRef.id,
      totalCalories:  totals.calorieTotal,
      totalProteinG:  totals.proteinTotalG,
      totalCarbsG:    totals.carbsTotalG,
      totalFatG:      totals.fatTotalG,
      createdAt:      now,
      updatedAt:      now,
    };

    await setDoc(entryRef, toEntryDocument(entry));
    // Invariant: every entry mutation triggers a day recompute
    await this.dayRepo.recompute(uid, entry.date);
    return entry;
  }

  async update(uid: string, entryId: string, patch: Partial<Entry>): Promise<Entry> {
    const existing = await this.getById(uid, entryId);
    if (!existing) throw new Error(`Entry ${entryId} not found`);

    // If items changed, recompute cached totals from the new items
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

    await setDoc(
      doc(this.db, COLLECTIONS.entry(uid, entryId)),
      toEntryDocument(updated),
    );

    // Recompute day for the updated date (and old date if the date changed)
    await this.dayRepo.recompute(uid, updated.date);
    if (patch.date && patch.date !== existing.date) {
      await this.dayRepo.recompute(uid, existing.date);
    }

    return updated;
  }

  async delete(uid: string, entryId: string): Promise<void> {
    const existing = await this.getById(uid, entryId);
    if (!existing) return; // idempotent

    await deleteDoc(doc(this.db, COLLECTIONS.entry(uid, entryId)));
    await this.dayRepo.recompute(uid, existing.date);
  }

  async copySlot(
    uid: string,
    from: { date: string; slot: MealSlot },
    to: { date: string; slot: MealSlot },
  ): Promise<Entry[]> {
    const sourceEntries = await this.list(uid, {
      date: from.date,
      slot: from.slot,
    });

    if (sourceEntries.length === 0) return [];

    const now = new Date().toISOString();
    const batch = writeBatch(this.db);
    const newEntries: Entry[] = [];

    for (const source of sourceEntries) {
      const newRef = doc(collection(this.db, COLLECTIONS.entries(uid)));
      const newEntry: Entry = {
        ...source,
        id:        newRef.id,
        date:      to.date,
        slot:      to.slot,
        timestamp: now,
        createdAt: now,
        updatedAt: now,
      };
      batch.set(newRef, toEntryDocument(newEntry));
      newEntries.push(newEntry);
    }

    await batch.commit();
    await this.dayRepo.recompute(uid, to.date);
    return newEntries;
  }
}
