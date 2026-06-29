'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Spinner } from '@/components/ui';
import { signInWithGoogle } from '@/lib/firebase/auth';
import { profileRepository } from '@/lib/firestore';

export default function LoginPage() {
  const router       = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  async function handleSignIn() {
    setIsSigningIn(true);
    setError(null);
    try {
      const { user } = await signInWithGoogle();
      const profile = await profileRepository.get(user.uid);
      if (profile?.onboardingComplete) {
        router.replace('/today');
      } else {
        router.replace('/onboarding');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.');
      setIsSigningIn(false);
    }
  }

  return (
    <div className="min-h-dvh bg-surface-page flex flex-col items-center justify-center px-6">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-brand-500 flex items-center justify-center">
          <span className="text-2xl font-bold text-white">FT</span>
        </div>
        <h1 className="text-2xl font-bold text-text-primary">FoodTrack</h1>
        <p className="mt-1 text-sm text-text-secondary">Personal nutrition tracking</p>
      </div>

      <Card className="w-full max-w-sm" padding="lg">
        <p className="text-sm text-text-secondary mb-6 text-center">
          Sign in with your Google account to get started.
        </p>

        {error && (
          <p className="text-sm text-error text-center mb-4">{error}</p>
        )}

        <Button fullWidth variant="primary" onClick={handleSignIn} disabled={isSigningIn}>
          {isSigningIn ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner size="sm" color="white" />
              Signing in…
            </span>
          ) : (
            'Continue with Google'
          )}
        </Button>
      </Card>
    </div>
  );
}
