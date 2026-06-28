/**
 * Repository factory.
 *
 * Creates and wires repository instances with the shared Firestore db.
 * Import from here — never instantiate repositories directly in components or hooks.
 *
 * Usage:
 *   import { entryRepository, profileRepository, dayRepository } from '@/lib/firestore';
 */

import db from '@/lib/firebase/firestore';
import { FirestoreProfileRepository } from './ProfileRepository';
import { FirestoreDayRepository } from './DayRepository';
import { FirestoreEntryRepository } from './EntryRepository';

// DayRepository has no external dependencies
export const dayRepository = new FirestoreDayRepository(db);

// EntryRepository depends on DayRepository (triggers recompute after mutations)
export const entryRepository = new FirestoreEntryRepository(db, dayRepository);

// ProfileRepository has no external dependencies
export const profileRepository = new FirestoreProfileRepository(db);
