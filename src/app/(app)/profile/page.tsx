'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/navigation/TopBar';
import { Card, Button, Avatar, BottomSheet } from '@/components/ui';
import { SyncButton, SyncProgress } from '@/components/sync';
import { useProfile } from '@/hooks/useProfile';
import { useUserStore } from '@/store/useUserStore';
import { signOut } from '@/lib/firebase/auth';

const GOAL_LABELS: Record<string, string> = {
  fat_loss:    'Lose fat',
  maintain:    'Stay balanced',
  muscle_gain: 'Build muscle',
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary:         'Sedentary',
  lightly_active:    'Lightly active',
  moderately_active: 'Moderately active',
  very_active:       'Very active',
};

export default function ProfilePage() {
  const router   = useRouter();
  const user     = useUserStore((s) => s.user);
  const clear    = useUserStore((s) => s.clear);
  const { profile } = useProfile();
  const [showSignOutSheet, setShowSignOutSheet] = useState(false);

  async function handleSignOut() {
    await signOut();
    clear();
    router.replace('/login');
  }

  const displayName = profile?.name ?? user?.displayName ?? 'You';
  const initials    = displayName.slice(0, 2).toUpperCase();
  const photoURL    = user?.photoURL ?? undefined;

  return (
    <>
      <TopBar title="Profile" />
      <div className="pt-[56px] pb-[68px] px-4 space-y-4">
        <div className="pt-6 flex flex-col items-center gap-3 pb-2">
          <Avatar src={photoURL} fallback={initials} alt={displayName} size="xl" />
          <div className="text-center">
            <h2 className="text-xl font-bold text-text-primary">{displayName}</h2>
            {user?.email && (
              <p className="text-sm text-text-secondary">{user.email}</p>
            )}
          </div>
        </div>

        {profile && (
          <Card padding="md">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Your targets
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <p className="text-text-secondary">Goal</p>
                <p className="font-medium text-text-primary">{GOAL_LABELS[profile.goal] ?? profile.goal}</p>
              </div>
              <div>
                <p className="text-text-secondary">Activity</p>
                <p className="font-medium text-text-primary">{ACTIVITY_LABELS[profile.activityLevel] ?? profile.activityLevel}</p>
              </div>
              <div>
                <p className="text-text-secondary">Calories</p>
                <p className="font-medium text-text-primary">{profile.targets.calorieTarget} kcal</p>
              </div>
              <div>
                <p className="text-text-secondary">Protein</p>
                <p className="font-medium text-text-primary">{profile.targets.proteinTargetG}g</p>
              </div>
              <div>
                <p className="text-text-secondary">BMR</p>
                <p className="font-medium text-text-primary">{profile.bmr} kcal</p>
              </div>
              <div>
                <p className="text-text-secondary">TDEE</p>
                <p className="font-medium text-text-primary">{profile.tdee} kcal</p>
              </div>
            </div>
          </Card>
        )}

        <Card padding="md">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
            Health Connect
          </h3>
          <p className="text-sm text-text-secondary mb-4">
            {profile?.healthConnectEnabled
              ? 'Sync enabled — wearable data adjusts your daily targets on training days.'
              : 'Sync not enabled. Enable it to adjust targets based on your Samsung Health data.'}
          </p>
          <div className="flex flex-col gap-3">
            <SyncButton />
            <SyncProgress />
          </div>
        </Card>

        <Card padding="md">
          <Button
            variant="ghost"
            fullWidth
            onClick={() => setShowSignOutSheet(true)}
            className="text-error hover:text-error"
          >
            Sign out
          </Button>
        </Card>
      </div>

      <BottomSheet
        open={showSignOutSheet}
        onClose={() => setShowSignOutSheet(false)}
        title="Sign out"
      >
        <div className="flex flex-col gap-4 px-4 pb-6">
          <p className="text-sm text-text-secondary">
            Are you sure you want to sign out? Your data is saved in the cloud.
          </p>
          <Button variant="danger" onClick={handleSignOut} fullWidth>
            Sign out
          </Button>
          <Button variant="ghost" onClick={() => setShowSignOutSheet(false)} fullWidth>
            Cancel
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
