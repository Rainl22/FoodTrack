import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  type Firestore,
} from 'firebase/firestore';
import type { IDayRepository } from '@/repositories';
import type { DayAggregate, DayActivity, MacroTotals } from '@/types/nutrition';
import type { MacroTargets } from '@/types/user';
import type { DayDocument, EntryDocument } from '@/types/firestore';
import { COLLECTIONS, ENTRY_FIELDS, DAY_FIELDS } from './schema';
import { fromDayDocument, toDayDocument } from './mappers';
import { sumEntries } from '@/lib/nutrition/totals';
import { adjustTargetsForTraining } from '@/lib/nutrition/adjust';
import type { Entry } from '@/types/nutrition';

export class FirestoreDayRepository implements IDayRepository {
  constructor(private readonly db: Firestore) {}

  async get(uid: string, date: string): Promise<DayAggregate | null> {
    const snap = await getDoc(doc(this.db, COLLECTIONS.day(uid, date)));
    if (!snap.exists()) return null;
    return fromDayDocument(snap.data() as DayDocument);
  }

  async getRange(uid: string, from: string, to: string): Promise<DayAggregate[]> {
    const q = query(
      collection(this.db, COLLECTIONS.days(uid)),
      where(DAY_FIELDS.date, '>=', from),
      where(DAY_FIELDS.date, '<=', to),
      orderBy(DAY_FIELDS.date, 'asc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => fromDayDocument(d.data() as DayDocument));
  }

  async recompute(uid: string, date: string): Promise<DayAggregate> {
    // 1. Preserve existing activity and adjusted targets
    const existingSnap = await getDoc(doc(this.db, COLLECTIONS.day(uid, date)));
    const existing = existingSnap.exists()
      ? (existingSnap.data() as DayDocument)
      : null;

    // 2. Query all entries for this date
    const q = query(
      collection(this.db, COLLECTIONS.entries(uid)),
      where(ENTRY_FIELDS.date, '==', date),
    );
    const entriesSnap = await getDocs(q);
    const entries = entriesSnap.docs.map(d => d.data() as EntryDocument) as Entry[];

    // 3. Sum totals from entries (source of truth)
    const totals: MacroTotals = sumEntries(entries);

    // 4. Build updated day document, preserving activity and adjusted targets
    const now = new Date().toISOString();
    const updated: DayDocument = {
      date,
      calorieTotal:  totals.calorieTotal,
      proteinTotalG: totals.proteinTotalG,
      carbsTotalG:   totals.carbsTotalG,
      fatTotalG:     totals.fatTotalG,
      lastComputedAt: now,
    };

    // Preserve wearable-set fields — recompute never clears them
    if (existing?.activity)              updated.activity              = existing.activity;
    if (existing?.adjustedCalorieTarget) updated.adjustedCalorieTarget  = existing.adjustedCalorieTarget;
    if (existing?.adjustedProteinTargetG)updated.adjustedProteinTargetG = existing.adjustedProteinTargetG;
    if (existing?.adjustedCarbsTargetG)  updated.adjustedCarbsTargetG   = existing.adjustedCarbsTargetG;
    if (existing?.adjustedFatTargetG)    updated.adjustedFatTargetG     = existing.adjustedFatTargetG;

    await setDoc(doc(this.db, COLLECTIONS.day(uid, date)), updated);
    return fromDayDocument(updated);
  }

  async setActivity(
    uid: string,
    date: string,
    activity: DayActivity,
    baselineTargets?: MacroTargets,
  ): Promise<DayAggregate> {
    // Read existing day so we keep accumulated entry totals
    const existingSnap = await getDoc(doc(this.db, COLLECTIONS.day(uid, date)));
    const existing = existingSnap.exists()
      ? (existingSnap.data() as DayDocument)
      : null;

    const now = new Date().toISOString();
    const updated: DayDocument = {
      date,
      calorieTotal:  existing?.calorieTotal  ?? 0,
      proteinTotalG: existing?.proteinTotalG ?? 0,
      carbsTotalG:   existing?.carbsTotalG   ?? 0,
      fatTotalG:     existing?.fatTotalG     ?? 0,
      activity,
      lastComputedAt: now,
    };

    // Compute and store adjusted targets if baseline is available
    if (baselineTargets) {
      const adj = adjustTargetsForTraining(baselineTargets, activity);
      updated.adjustedCalorieTarget  = adj.adjustedCalorieTarget;
      updated.adjustedProteinTargetG = adj.adjustedProteinTargetG;
      updated.adjustedCarbsTargetG   = adj.adjustedCarbsTargetG;
      updated.adjustedFatTargetG     = adj.adjustedFatTargetG;
    }

    await setDoc(doc(this.db, COLLECTIONS.day(uid, date)), updated);
    return fromDayDocument(updated);
  }
}
