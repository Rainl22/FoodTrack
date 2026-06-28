// ─── User & Profile domain types ─────────────────────────────────────────────

export type Goal = 'fat_loss' | 'maintain' | 'muscle_gain';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active';

export type BiologicalSex = 'male' | 'female' | 'not_specified';

export interface MacroTargets {
  calorieTarget:  number; // kcal
  proteinTargetG: number; // grams
  carbsTargetG:   number; // grams
  fatTargetG:     number; // grams
}

export interface UserProfile {
  // Personal
  name:        string;
  dateOfBirth: string;       // YYYY-MM-DD
  sex:         BiologicalSex;
  heightCm:    number;
  weightKg:    number;

  // Goal & baseline
  goal:               Goal;
  activityLevel:      ActivityLevel;
  weeklyTrainingDays: number;         // 0–7

  // Computed (stored for display, always recomputable from the above)
  bmr:  number;                       // kcal
  tdee: number;                       // kcal
  targets: MacroTargets;

  // Health Connect
  healthConnectEnabled: boolean;
  lastSyncAt:           string | null; // ISO datetime

  // Meta
  onboardingComplete: boolean;
  createdAt:          string;
  updatedAt:          string;
}

// Partial form collected during onboarding — targets computed after completion
export type OnboardingData = Omit<
  UserProfile,
  'bmr' | 'tdee' | 'targets' | 'onboardingComplete' | 'createdAt' | 'updatedAt' | 'lastSyncAt' | 'healthConnectEnabled'
>;
