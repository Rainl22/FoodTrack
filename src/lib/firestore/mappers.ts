/**
 * Bidirectional mappers between domain types and Firestore document shapes.
 *
 * Rules:
 * - Domain types flow outward from repositories to components.
 * - Document shapes are internal to this folder only.
 * - Mappers validate required fields so bad Firestore data fails loudly here,
 *   not silently in the UI.
 */

import type { UserProfile, MacroTargets } from '@/types/user';
import type { Entry, DayAggregate, DayActivity, MacroTotals, AdjustedTargets } from '@/types/nutrition';
import type { ProfileDocument, EntryDocument, DayDocument } from '@/types/firestore';

// ─── Profile ─────────────────────────────────────────────────────────────────

export function toProfileDocument(
  profile: UserProfile,
): ProfileDocument {
  const { targets, ...rest } = profile;
  return {
    ...rest,
    calorieTarget:  targets.calorieTarget,
    proteinTargetG: targets.proteinTargetG,
    carbsTargetG:   targets.carbsTargetG,
    fatTargetG:     targets.fatTargetG,
  };
}

export function fromProfileDocument(doc: ProfileDocument): UserProfile {
  const {
    calorieTarget,
    proteinTargetG,
    carbsTargetG,
    fatTargetG,
    ...rest
  } = doc;
  return {
    ...rest,
    targets: { calorieTarget, proteinTargetG, carbsTargetG, fatTargetG },
  };
}

// ─── Entry ────────────────────────────────────────────────────────────────────

// Entry domain type and EntryDocument are identical — no flattening needed.
// Mappers exist for consistency and to isolate any future schema divergence.

export function toEntryDocument(entry: Entry): EntryDocument {
  return { ...entry };
}

export function fromEntryDocument(doc: EntryDocument): Entry {
  return { ...doc };
}

// ─── Day ─────────────────────────────────────────────────────────────────────

export function toDayDocument(
  day: DayAggregate,
): DayDocument {
  const doc: DayDocument = {
    date:           day.date,
    calorieTotal:   day.totals.calorieTotal,
    proteinTotalG:  day.totals.proteinTotalG,
    carbsTotalG:    day.totals.carbsTotalG,
    fatTotalG:      day.totals.fatTotalG,
    lastComputedAt: day.lastComputedAt,
  };

  if (day.adjustedTargets) {
    doc.adjustedCalorieTarget  = day.adjustedTargets.adjustedCalorieTarget;
    doc.adjustedProteinTargetG = day.adjustedTargets.adjustedProteinTargetG;
    doc.adjustedCarbsTargetG   = day.adjustedTargets.adjustedCarbsTargetG;
    doc.adjustedFatTargetG     = day.adjustedTargets.adjustedFatTargetG;
  }

  if (day.activity) {
    doc.activity = day.activity;
  }

  return doc;
}

export function fromDayDocument(doc: DayDocument): DayAggregate {
  const totals: MacroTotals = {
    calorieTotal:  doc.calorieTotal,
    proteinTotalG: doc.proteinTotalG,
    carbsTotalG:   doc.carbsTotalG,
    fatTotalG:     doc.fatTotalG,
  };

  const adjustedTargets: AdjustedTargets | undefined =
    doc.adjustedCalorieTarget != null
      ? {
          adjustedCalorieTarget:  doc.adjustedCalorieTarget,
          adjustedProteinTargetG: doc.adjustedProteinTargetG!,
          adjustedCarbsTargetG:   doc.adjustedCarbsTargetG!,
          adjustedFatTargetG:     doc.adjustedFatTargetG!,
        }
      : undefined;

  return {
    date:            doc.date,
    totals,
    adjustedTargets,
    activity:        doc.activity as DayActivity | undefined,
    lastComputedAt:  doc.lastComputedAt,
  };
}

// ─── MacroTargets from profile document ──────────────────────────────────────

export function targetsFromProfileDocument(doc: ProfileDocument): MacroTargets {
  return {
    calorieTarget:  doc.calorieTarget,
    proteinTargetG: doc.proteinTargetG,
    carbsTargetG:   doc.carbsTargetG,
    fatTargetG:     doc.fatTargetG,
  };
}
