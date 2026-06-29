'use client';

import { useEffect, useState } from 'react';
import { profileRepository } from '@/lib/firestore';
import { useUserStore } from '@/store/useUserStore';
import type { UserProfile } from '@/types';

interface UseProfileResult {
  profile:     UserProfile | null;
  isLoading:   boolean;
  error:       string | null;
  saveProfile: (data: UserProfile) => Promise<void>;
}

/**
 * Load the current user's profile from Firestore and keep the store in sync.
 * `saveProfile` is used by onboarding to write (or overwrite) the profile document.
 */
export function useProfile(): UseProfileResult {
  const user       = useUserStore((s) => s.user);
  const profile    = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);

  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!user || profile) return;  // skip if not authenticated or already loaded

    setIsLoading(true);
    setError(null);

    profileRepository
      .get(user.uid)
      .then((p) => setProfile(p))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load profile'))
      .finally(() => setIsLoading(false));
  }, [user?.uid]);  // re-run only when uid changes (not on every render)

  const saveProfile = async (data: UserProfile): Promise<void> => {
    if (!user) throw new Error('Not authenticated');

    const existing = await profileRepository.get(user.uid);
    if (existing) {
      await profileRepository.update(user.uid, data);
      setProfile(data);
    } else {
      // create requires OnboardingData + computed fields separately
      const { bmr, tdee, targets, onboardingComplete, createdAt, updatedAt, lastSyncAt, healthConnectEnabled, ...onboardingData } = data;
      const saved = await profileRepository.create(
        user.uid,
        onboardingData,
        { bmr, tdee, targets },
      );
      setProfile(saved);
    }
  };

  return { profile, isLoading, error, saveProfile };
}
