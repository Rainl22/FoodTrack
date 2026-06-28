/**
 * Baseline macro targets from TDEE + goal + bodyweight.
 * Pure functions — no side effects.
 */

import type { Goal } from '@/types/user';
import type { MacroTargets } from '@/types/user';
import { GOAL_CALORIE_OFFSETS, PROTEIN_PER_KG, FAT_CALORIES_PCT, KCAL_PER_G } from '@/config/constants';

export function calculateTargets(params: {
  tdee:      number;
  goal:      Goal;
  weightKg:  number;
}): MacroTargets {
  const { tdee, goal, weightKg } = params;

  const calorieTarget = Math.round(tdee + GOAL_CALORIE_OFFSETS[goal]);

  // Protein: g per kg bodyweight, independent of calorie target
  const proteinTargetG = Math.round(weightKg * PROTEIN_PER_KG);

  // Fat: % of total calories
  const fatTargetG = Math.round((calorieTarget * FAT_CALORIES_PCT) / KCAL_PER_G.fat);

  // Carbs: remainder after protein and fat
  const proteinKcal = proteinTargetG * KCAL_PER_G.protein;
  const fatKcal     = fatTargetG     * KCAL_PER_G.fat;
  const carbsKcal   = Math.max(0, calorieTarget - proteinKcal - fatKcal);
  const carbsTargetG = Math.round(carbsKcal / KCAL_PER_G.carbs);

  return { calorieTarget, proteinTargetG, carbsTargetG, fatTargetG };
}
