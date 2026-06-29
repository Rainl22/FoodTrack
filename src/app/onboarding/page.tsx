'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stepper } from '@/components/ui';
import {
  StepPersonal,
  StepBody,
  StepGoal,
  StepActivity,
  StepHealthConnect,
} from '@/components/onboarding';
import { useProfile } from '@/hooks/useProfile';
import { calculateBMR, calculateTDEE } from '@/lib/nutrition/bmr';
import { calculateTargets } from '@/lib/nutrition/targets';
import type { UserProfile } from '@/types';
import type { BiologicalSex, Goal, ActivityLevel } from '@/types';

interface OnboardingData {
  name?:               string;
  dateOfBirth?:        string;
  sex?:                BiologicalSex;
  heightCm?:           number;
  weightKg?:           number;
  goal?:               Goal;
  activityLevel?:      ActivityLevel;
  weeklyTrainingDays?: number;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { saveProfile } = useProfile();

  const [step, setStep]       = useState(0);
  const [data, setData]       = useState<OnboardingData>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const STEP_LABELS = [
    'About you', 'Body', 'Your goal', 'Activity', 'Health Connect',
  ];

  async function handleFinish({ healthConnectEnabled }: { healthConnectEnabled: boolean }) {
    if (
      !data.name || !data.dateOfBirth || !data.sex ||
      !data.heightCm || !data.weightKg || !data.goal ||
      !data.activityLevel || data.weeklyTrainingDays === undefined
    ) {
      setError('Missing required fields. Please restart onboarding.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const bmr     = calculateBMR({
        weightKg:    data.weightKg,
        heightCm:    data.heightCm,
        dateOfBirth: data.dateOfBirth,
        sex:         data.sex,
      });
      const tdee    = calculateTDEE(bmr, data.activityLevel);
      const targets = calculateTargets({ tdee, goal: data.goal, weightKg: data.weightKg });
      const now     = new Date().toISOString();

      const profile: UserProfile = {
        name:               data.name,
        dateOfBirth:        data.dateOfBirth,
        sex:                data.sex,
        heightCm:           data.heightCm,
        weightKg:           data.weightKg,
        goal:               data.goal,
        activityLevel:      data.activityLevel,
        weeklyTrainingDays: data.weeklyTrainingDays,
        bmr,
        tdee,
        targets,
        healthConnectEnabled,
        lastSyncAt:         null,
        onboardingComplete:  true,
        createdAt:          now,
        updatedAt:          now,
      };

      await saveProfile(profile);
      router.replace('/today');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save profile. Please try again.');
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-dvh bg-surface-page flex flex-col px-6 py-10">
      <div className="mb-8">
        <Stepper steps={5} current={step} className="mb-4" />
        <p className="text-sm text-text-secondary">
          Step {step + 1} of 5 — {STEP_LABELS[step]}
        </p>
      </div>

      {error && (
        <p className="text-sm text-error mb-4">{error}</p>
      )}

      {step === 0 && (
        <StepPersonal
          defaultValues={{ name: data.name, dateOfBirth: data.dateOfBirth, sex: data.sex }}
          onNext={(d) => {
            setData((prev) => ({ ...prev, ...d }));
            setStep(1);
          }}
        />
      )}

      {step === 1 && (
        <StepBody
          defaultValues={{ heightCm: data.heightCm, weightKg: data.weightKg }}
          onNext={(d) => {
            setData((prev) => ({ ...prev, ...d }));
            setStep(2);
          }}
          onBack={() => setStep(0)}
        />
      )}

      {step === 2 && (
        <StepGoal
          defaultValue={data.goal}
          onNext={(d) => {
            setData((prev) => ({ ...prev, ...d }));
            setStep(3);
          }}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <StepActivity
          defaultValues={{
            activityLevel:      data.activityLevel,
            weeklyTrainingDays: data.weeklyTrainingDays,
          }}
          onNext={(d) => {
            setData((prev) => ({ ...prev, ...d }));
            setStep(4);
          }}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && (
        <StepHealthConnect
          onFinish={handleFinish}
          onBack={() => setStep(3)}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
