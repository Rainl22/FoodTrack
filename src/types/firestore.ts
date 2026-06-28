// ─── Firestore document shapes ────────────────────────────────────────────────
// These mirror the domain types but represent the exact on-disk serialization.
// Mappers in src/lib/firestore/ translate between these and domain types.
//
// Path structure:
//   users/{uid}/profile/main
//   users/{uid}/entries/{entryId}
//   users/{uid}/days/{YYYY-MM-DD}
//
// Ownership is enforced by the path uid — no userId field in documents.
// Security rule: match /users/{uid}/{document=**} {
//   allow read, write: if request.auth != null && request.auth.uid == uid;
// }

import type { UserProfile } from './user';
import type { Entry, DayAggregate } from './nutrition';

// Profile document at users/{uid}/profile/main
// Serialized 1:1 with the UserProfile domain type.
// targets is flattened (no nested object in Firestore).
export type ProfileDocument = Omit<UserProfile, 'targets'> & {
  calorieTarget:  number;
  proteinTargetG: number;
  carbsTargetG:   number;
  fatTargetG:     number;
};

// Entry document at users/{uid}/entries/{entryId}
// Serialized 1:1 with the Entry domain type.
export type EntryDocument = Entry;

// Day document at users/{uid}/days/{YYYY-MM-DD}
// totals and adjustedTargets are flattened for simpler Firestore queries.
export type DayDocument = {
  date:            string;
  // Flattened from MacroTotals
  calorieTotal:    number;
  proteinTotalG:   number;
  carbsTotalG:     number;
  fatTotalG:       number;
  // Flattened from AdjustedTargets (all optional)
  adjustedCalorieTarget?:  number;
  adjustedProteinTargetG?: number;
  adjustedCarbsTargetG?:   number;
  adjustedFatTargetG?:     number;
  // Activity (nested object — acceptable since it's always read as a unit)
  activity?:       DayAggregate['activity'];
  lastComputedAt:  string;
};
