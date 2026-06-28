/**
 * Firestore Schema Reference
 * ==========================
 *
 * This file is the single source of truth for collection paths, field names,
 * and index requirements. Import path constants from here — never hardcode
 * collection names or field paths in repository files.
 *
 * Security model
 * ──────────────
 * All data lives under users/{uid}. Ownership is the path uid — documents
 * do NOT contain a userId field.
 *
 * Security rule:
 *   match /users/{uid}/{document=**} {
 *     allow read, write: if request.auth != null && request.auth.uid == uid;
 *   }
 *
 * Collections
 * ───────────
 *
 * users/{uid}/profile/main
 *   Singleton profile document. Fields mirror ProfileDocument in src/types/firestore.ts.
 *   Targets are flattened (calorieTarget, proteinTargetG, etc.) for direct Firestore reads.
 *
 * users/{uid}/entries/{entryId}
 *   Source of truth for all logged food/drink/supplement data.
 *   entryId is a Firestore auto-generated doc ID.
 *   Fields mirror EntryDocument in src/types/firestore.ts.
 *
 * users/{uid}/days/{YYYY-MM-DD}
 *   Maintained aggregate cache. NEVER edited directly — always recomputed by
 *   DayRepository.recompute() after any entry mutation on that date.
 *   Fields mirror DayDocument in src/types/firestore.ts.
 *
 * Source of truth
 * ───────────────
 *   entries  →  source of truth for nutrition data
 *   days     →  derived aggregate cache (recomputable from entries)
 *   profile  →  source of truth for user config and computed targets
 *
 * Required Indexes (composite)
 * ────────────────────────────
 *   Collection: entries
 *     - (date ASC, timestamp ASC)   — list entries for a specific day, in order
 *     - (date ASC, slot ASC)        — list entries by day and meal slot
 *     - (timestamp DESC)            — recent entries feed
 *
 *   Collection: days
 *     - (date ASC)                  — week strip query (range on date field)
 */

// ─── Collection paths ─────────────────────────────────────────────────────────

export const COLLECTIONS = {
  // users/{uid}/profile/main  (singleton — always doc ID 'main')
  profile: (uid: string) => `users/${uid}/profile/main`,

  // users/{uid}/entries/{entryId}
  entries: (uid: string) => `users/${uid}/entries`,
  entry:   (uid: string, entryId: string) => `users/${uid}/entries/${entryId}`,

  // users/{uid}/days/{YYYY-MM-DD}
  days: (uid: string) => `users/${uid}/days`,
  day:  (uid: string, date: string) => `users/${uid}/days/${date}`,
} as const;

// ─── Field names (prevent typos in queries) ───────────────────────────────────

export const ENTRY_FIELDS = {
  date:      'date',
  timestamp: 'timestamp',
  slot:      'slot',
  type:      'type',
} as const;

export const DAY_FIELDS = {
  date:           'date',
  lastComputedAt: 'lastComputedAt',
} as const;
