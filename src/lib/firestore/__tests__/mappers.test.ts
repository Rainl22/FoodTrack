import {
  toProfileDocument,
  fromProfileDocument,
  toEntryDocument,
  fromEntryDocument,
  toDayDocument,
  fromDayDocument,
} from '../mappers';
import type { UserProfile } from '@/types/user';
import type { Entry, DayAggregate } from '@/types/nutrition';

// ─── Profile mappers ──────────────────────────────────────────────────────────

const profile: UserProfile = {
  name: 'Alex', dateOfBirth: '1993-05-20', sex: 'male',
  heightCm: 178, weightKg: 80,
  goal: 'maintain', activityLevel: 'moderately_active', weeklyTrainingDays: 4,
  bmr: 1850, tdee: 2868,
  targets: { calorieTarget: 2868, proteinTargetG: 160, carbsTargetG: 330, fatTargetG: 88 },
  healthConnectEnabled: false, lastSyncAt: null,
  onboardingComplete: true, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
};

describe('profile mappers', () => {
  it('round-trips without data loss', () => {
    expect(fromProfileDocument(toProfileDocument(profile))).toEqual(profile);
  });

  it('flattens targets to top-level fields in document', () => {
    const doc = toProfileDocument(profile);
    expect(doc.calorieTarget).toBe(2868);
    expect(doc.proteinTargetG).toBe(160);
    expect((doc as Record<string, unknown>).targets).toBeUndefined();
  });

  it('restores nested targets from document', () => {
    const result = fromProfileDocument(toProfileDocument(profile));
    expect(result.targets.calorieTarget).toBe(2868);
    expect(result.targets.proteinTargetG).toBe(160);
  });
});

// ─── Entry mappers ────────────────────────────────────────────────────────────

const entry: Entry = {
  id: 'e1', type: 'meal', slot: 'breakfast', name: 'Oat bowl',
  date: '2025-06-15', timestamp: '2025-06-15T07:30:00Z',
  items: [{
    name: 'Oats', portionDescription: '80g', quantityG: 80,
    calories: 300, proteinG: 10, carbsG: 54, fatG: 6, confidence: 'high',
  }],
  totalCalories: 300, totalProteinG: 10, totalCarbsG: 54, totalFatG: 6,
  inputMethod: 'manual',
  createdAt: '2025-06-15T07:30:00Z', updatedAt: '2025-06-15T07:30:00Z',
};

describe('entry mappers', () => {
  it('round-trips without data loss', () => {
    expect(fromEntryDocument(toEntryDocument(entry))).toEqual(entry);
  });
});

// ─── Day mappers ──────────────────────────────────────────────────────────────

const dayWithActivity: DayAggregate = {
  date: '2025-06-15',
  totals: { calorieTotal: 1800, proteinTotalG: 145, carbsTotalG: 210, fatTotalG: 62 },
  adjustedTargets: {
    adjustedCalorieTarget: 2400, adjustedProteinTargetG: 180,
    adjustedCarbsTargetG: 280, adjustedFatTargetG: 75,
  },
  activity: {
    steps: 9500, activeCaloriesKcal: 420,
    trainingDay: true, trainingType: 'strength',
    workoutCount: 1, totalDurationMin: 55,
  },
  lastComputedAt: '2025-06-15T21:00:00Z',
};

const dayMinimal: DayAggregate = {
  date: '2025-06-16',
  totals: { calorieTotal: 0, proteinTotalG: 0, carbsTotalG: 0, fatTotalG: 0 },
  lastComputedAt: '2025-06-16T00:00:00Z',
};

describe('day mappers', () => {
  it('round-trips full day with activity and adjusted targets', () => {
    expect(fromDayDocument(toDayDocument(dayWithActivity))).toEqual(dayWithActivity);
  });

  it('round-trips minimal day without optional fields', () => {
    const result = fromDayDocument(toDayDocument(dayMinimal));
    expect(result.date).toBe('2025-06-16');
    expect(result.adjustedTargets).toBeUndefined();
    expect(result.activity).toBeUndefined();
  });

  it('flattens adjustedTargets in document', () => {
    const d = toDayDocument(dayWithActivity);
    expect(d.adjustedCalorieTarget).toBe(2400);
    expect((d as Record<string, unknown>).adjustedTargets).toBeUndefined();
  });
});
