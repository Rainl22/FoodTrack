// Repository interfaces — import from here, not from individual files.
// Implementations are in src/lib/firestore/ and injected via hooks.

export type { IProfileRepository } from './IProfileRepository';
export type { IEntryRepository, EntryQuery } from './IEntryRepository';
export type { IDayRepository } from './IDayRepository';
