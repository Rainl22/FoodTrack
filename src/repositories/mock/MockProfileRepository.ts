/**
 * In-memory IProfileRepository implementation for tests and Storybook.
 */

import type { IProfileRepository } from '@/repositories';
import type { UserProfile, OnboardingData, MacroTargets } from '@/types/user';

export class MockProfileRepository implements IProfileRepository {
  private store = new Map<string, UserProfile>();

  seed(uid: string, profile: UserProfile): void {
    this.store.set(uid, profile);
  }

  clear(): void {
    this.store.clear();
  }

  async get(uid: string): Promise<UserProfile | null> {
    return this.store.get(uid) ?? null;
  }

  async create(
    uid: string,
    data: OnboardingData,
    computed: { bmr: number; tdee: number; targets: MacroTargets },
  ): Promise<UserProfile> {
    const now = new Date().toISOString();
    const profile: UserProfile = {
      ...data,
      bmr:                  computed.bmr,
      tdee:                 computed.tdee,
      targets:              computed.targets,
      healthConnectEnabled: false,
      lastSyncAt:           null,
      onboardingComplete:   true,
      createdAt:            now,
      updatedAt:            now,
    };
    this.store.set(uid, profile);
    return profile;
  }

  async update(uid: string, patch: Partial<UserProfile>): Promise<UserProfile> {
    const existing = this.store.get(uid);
    if (!existing) throw new Error(`Profile not found for uid ${uid}`);
    const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.store.set(uid, updated);
    return updated;
  }

  async setLastSyncAt(uid: string, at: string): Promise<void> {
    const existing = this.store.get(uid);
    if (!existing) return;
    this.store.set(uid, { ...existing, lastSyncAt: at, updatedAt: new Date().toISOString() });
  }
}
