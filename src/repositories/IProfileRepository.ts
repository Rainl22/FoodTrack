import type { UserProfile, OnboardingData } from '@/types/user';
import type { MacroTargets } from '@/types/user';

/**
 * Contract for user profile persistence.
 * Implementation lives in FirestoreProfileRepository.
 * Components never call this directly — use useProfile() hook.
 */
export interface IProfileRepository {
  /**
   * Load the authenticated user's profile.
   * Returns null if no profile exists yet (pre-onboarding).
   */
  get(uid: string): Promise<UserProfile | null>;

  /**
   * Create the profile after onboarding completes.
   * Targets are computed by the nutrition domain layer before calling this.
   */
  create(
    uid: string,
    data: OnboardingData,
    computed: { bmr: number; tdee: number; targets: MacroTargets },
  ): Promise<UserProfile>;

  /**
   * Partial update — e.g. when user edits weight or goal after onboarding.
   * Caller is responsible for recomputing targets before calling if relevant fields changed.
   */
  update(uid: string, patch: Partial<UserProfile>): Promise<UserProfile>;

  /**
   * Record the timestamp of the most recent Health Connect sync.
   */
  setLastSyncAt(uid: string, at: string): Promise<void>;
}
