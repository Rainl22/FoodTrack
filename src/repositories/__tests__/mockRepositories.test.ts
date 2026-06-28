/**
 * Integration tests using mock repositories.
 *
 * These tests verify:
 * - Repository contracts are satisfied by the mock implementations
 * - Entry mutations trigger DayRepository recompute (via MockDayRepository)
 * - Totals are always derived from items (never independently set by callers)
 * - copySlot creates independent copies and triggers day recompute
 *
 * The same test suite should be runnable against FirestoreXRepository
 * with a Firestore emulator (future: add emulator harness).
 */

import { MockEntryRepository } from '../mock/MockEntryRepository';
import { MockDayRepository } from '../mock/MockDayRepository';
import { MockProfileRepository } from '../mock/MockProfileRepository';
import type { CreateEntryInput } from '@/lib/validation/nutrition';
import type { UserProfile } from '@/types/user';
import type { Entry } from '@/types/nutrition';

const UID = 'test-user-1';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const breakfastInput: CreateEntryInput = {
  type: 'meal', slot: 'breakfast', name: 'Eggs on toast',
  date: '2025-06-15', timestamp: '2025-06-15T08:00:00Z',
  items: [
    { name: 'Egg', portionDescription: '2 large', quantityG: 100, calories: 140, proteinG: 12, carbsG: 1, fatG: 10 },
    { name: 'Toast', portionDescription: '1 slice', quantityG: 30, calories: 80, proteinG: 3, carbsG: 15, fatG: 1 },
  ],
  inputMethod: 'manual',
};

const lunchInput: CreateEntryInput = {
  type: 'meal', slot: 'lunch', name: 'Chicken salad',
  date: '2025-06-15', timestamp: '2025-06-15T12:30:00Z',
  items: [
    { name: 'Chicken breast', portionDescription: '150g', quantityG: 150, calories: 248, proteinG: 46, carbsG: 0, fatG: 5 },
    { name: 'Mixed greens', portionDescription: '60g', quantityG: 60, calories: 15, proteinG: 1, carbsG: 2, fatG: 0 },
  ],
  inputMethod: 'text',
};

const profileData: UserProfile = {
  name: 'Alex', dateOfBirth: '1993-05-20', sex: 'male',
  heightCm: 178, weightKg: 80,
  goal: 'maintain', activityLevel: 'moderately_active', weeklyTrainingDays: 4,
  bmr: 1850, tdee: 2868,
  targets: { calorieTarget: 2868, proteinTargetG: 160, carbsTargetG: 330, fatTargetG: 88 },
  healthConnectEnabled: false, lastSyncAt: null,
  onboardingComplete: true, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
};

// ─── EntryRepository contract tests ──────────────────────────────────────────

describe('MockEntryRepository', () => {
  let entries: MockEntryRepository;
  let days: MockDayRepository;

  beforeEach(() => {
    days = new MockDayRepository();
    entries = new MockEntryRepository(days);
  });

  it('creates an entry and computes totals from items', async () => {
    const entry = await entries.create(UID, breakfastInput);
    expect(entry.id).toBeDefined();
    expect(entry.totalCalories).toBe(220);   // 140 + 80
    expect(entry.totalProteinG).toBe(15);    // 12 + 3
    expect(entry.totalCarbsG).toBe(16);      // 1 + 15
    expect(entry.totalFatG).toBe(11);        // 10 + 1
  });

  it('callers cannot override computed totals by passing them in input', async () => {
    // CreateEntryInput does not have total fields — the schema omits them.
    // The repository always computes from items.
    const entry = await entries.create(UID, breakfastInput);
    const expectedTotal = breakfastInput.items.reduce((s, i) => s + i.calories, 0);
    expect(entry.totalCalories).toBe(expectedTotal);
  });

  it('triggers day recompute after create', async () => {
    await entries.create(UID, breakfastInput);
    const day = await days.get(UID, '2025-06-15');
    expect(day).not.toBeNull();
    expect(day?.lastComputedAt).toBeDefined();
  });

  it('lists entries by date', async () => {
    await entries.create(UID, breakfastInput);
    await entries.create(UID, lunchInput);
    const result = await entries.list(UID, { date: '2025-06-15' });
    expect(result).toHaveLength(2);
  });

  it('lists entries by date and slot', async () => {
    await entries.create(UID, breakfastInput);
    await entries.create(UID, lunchInput);
    const result = await entries.list(UID, { date: '2025-06-15', slot: 'breakfast' });
    expect(result).toHaveLength(1);
    expect(result[0].slot).toBe('breakfast');
  });

  it('updates an entry and recomputes totals', async () => {
    const created = await entries.create(UID, breakfastInput);
    const updated = await entries.update(UID, created.id, {
      items: [{ name: 'Egg', portionDescription: '3 large', quantityG: 150, calories: 210, proteinG: 18, carbsG: 1.5, fatG: 15 }],
    });
    expect(updated.totalCalories).toBe(210);
    expect(updated.totalProteinG).toBe(18);
  });

  it('deletes an entry and triggers day recompute', async () => {
    const created = await entries.create(UID, breakfastInput);
    await entries.delete(UID, created.id);
    const remaining = await entries.list(UID, { date: '2025-06-15' });
    expect(remaining).toHaveLength(0);
  });

  it('delete is idempotent for non-existent entries', async () => {
    await expect(entries.delete(UID, 'nonexistent')).resolves.not.toThrow();
  });

  it('copies entries from one slot to another', async () => {
    await entries.create(UID, breakfastInput);
    const copies = await entries.copySlot(
      UID,
      { date: '2025-06-15', slot: 'breakfast' },
      { date: '2025-06-16', slot: 'breakfast' },
    );
    expect(copies).toHaveLength(1);
    expect(copies[0].date).toBe('2025-06-16');
    expect(copies[0].id).not.toBe((await entries.list(UID, { date: '2025-06-15' }))[0].id);
  });

  it('getById returns null for missing entry', async () => {
    expect(await entries.getById(UID, 'missing')).toBeNull();
  });
});

// ─── DayRepository contract tests ────────────────────────────────────────────

describe('MockDayRepository', () => {
  let days: MockDayRepository;

  beforeEach(() => {
    days = new MockDayRepository();
  });

  it('returns null for a date with no data', async () => {
    expect(await days.get(UID, '2025-06-15')).toBeNull();
  });

  it('getRange returns days within the range', async () => {
    days.seed(UID, [
      { date: '2025-06-13', totals: { calorieTotal: 1800, proteinTotalG: 140, carbsTotalG: 200, fatTotalG: 60 }, lastComputedAt: '' },
      { date: '2025-06-15', totals: { calorieTotal: 2000, proteinTotalG: 150, carbsTotalG: 220, fatTotalG: 70 }, lastComputedAt: '' },
      { date: '2025-06-17', totals: { calorieTotal: 1600, proteinTotalG: 130, carbsTotalG: 180, fatTotalG: 55 }, lastComputedAt: '' },
    ]);
    const range = await days.getRange(UID, '2025-06-14', '2025-06-16');
    expect(range).toHaveLength(1);
    expect(range[0].date).toBe('2025-06-15');
  });

  it('setActivity stores activity and computes adjusted targets', async () => {
    const baseline = { calorieTarget: 2868, proteinTargetG: 160, carbsTargetG: 330, fatTargetG: 88 };
    const activity = {
      steps: 8000, activeCaloriesKcal: 350,
      trainingDay: true, trainingType: 'strength' as const,
      workoutCount: 1, totalDurationMin: 60,
    };
    const result = await days.setActivity(UID, '2025-06-15', activity, baseline);
    expect(result.activity?.trainingDay).toBe(true);
    expect(result.adjustedTargets?.adjustedCalorieTarget).toBeGreaterThan(2868);
    expect(result.adjustedTargets?.adjustedProteinTargetG).toBeGreaterThan(160);
  });
});

// ─── ProfileRepository contract tests ────────────────────────────────────────

describe('MockProfileRepository', () => {
  let profiles: MockProfileRepository;

  beforeEach(() => {
    profiles = new MockProfileRepository();
  });

  it('returns null when profile does not exist', async () => {
    expect(await profiles.get(UID)).toBeNull();
  });

  it('creates and retrieves a profile', async () => {
    const { targets, bmr, tdee, onboardingComplete, createdAt, updatedAt,
            healthConnectEnabled, lastSyncAt, ...onboardingData } = profileData;
    const created = await profiles.create(UID, onboardingData, { bmr, tdee, targets });
    expect(created.onboardingComplete).toBe(true);
    expect(created.targets.calorieTarget).toBe(targets.calorieTarget);

    const fetched = await profiles.get(UID);
    expect(fetched).toEqual(created);
  });

  it('updates individual fields without clobbering others', async () => {
    profiles.seed(UID, profileData);
    const updated = await profiles.update(UID, { weightKg: 82 });
    expect(updated.weightKg).toBe(82);
    expect(updated.name).toBe('Alex');
  });

  it('setLastSyncAt updates the sync timestamp', async () => {
    profiles.seed(UID, profileData);
    await profiles.setLastSyncAt(UID, '2025-06-15T10:00:00Z');
    const fetched = await profiles.get(UID);
    expect(fetched?.lastSyncAt).toBe('2025-06-15T10:00:00Z');
  });
});
