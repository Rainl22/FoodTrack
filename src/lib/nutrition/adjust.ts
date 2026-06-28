/**
 * Training-day macro adjustment.
 * Takes baseline targets and a DayActivity, returns adjusted targets.
 * Pure function — no Firestore, no React.
 */

import type { MacroTargets } from '@/types/user';
import type { DayActivity } from '@/types/nutrition';
import type { AdjustedTargets } from '@/types/nutrition';
import { TRAINING_ADJUSTMENTS, TRAINING_ADJUSTMENT_MAX_PCT, KCAL_PER_G } from '@/config/constants';

type MacroBoostLevel = 'high' | 'moderate' | 'slight' | 'stable' | 'slight_down';

function applyProteinBoost(base: number, level: MacroBoostLevel): number {
  const multipliers: Record<MacroBoostLevel, number> = {
    high:       1.15,
    moderate:   1.08,
    slight:     1.03,
    stable:     1.0,
    slight_down:0.97,
  };
  return Math.round(base * multipliers[level]);
}

function applyCarbBoost(base: number, level: MacroBoostLevel): number {
  const multipliers: Record<MacroBoostLevel, number> = {
    high:       1.20,
    moderate:   1.12,
    slight:     1.06,
    stable:     1.0,
    slight_down:0.93,
  };
  return Math.round(base * multipliers[level]);
}

function applyFatChange(base: number, level: MacroBoostLevel): number {
  const multipliers: Record<MacroBoostLevel, number> = {
    high:       1.05,
    moderate:   1.03,
    slight:     1.01,
    stable:     1.0,
    slight_down:0.90,
  };
  return Math.round(base * multipliers[level]);
}

export function adjustTargetsForTraining(
  baseline: MacroTargets,
  activity: DayActivity,
): AdjustedTargets {
  if (!activity.trainingDay) {
    return {
      adjustedCalorieTarget:  baseline.calorieTarget,
      adjustedProteinTargetG: baseline.proteinTargetG,
      adjustedCarbsTargetG:   baseline.carbsTargetG,
      adjustedFatTargetG:     baseline.fatTargetG,
    };
  }

  const type = activity.trainingType ?? 'rest';
  const adj = TRAINING_ADJUSTMENTS[type in TRAINING_ADJUSTMENTS ? type : 'rest'];

  // Cap calorie increase at TRAINING_ADJUSTMENT_MAX_PCT of baseline
  const rawCalorieIncrease = baseline.calorieTarget * adj.caloriePct;
  const cappedIncrease = Math.min(
    rawCalorieIncrease,
    baseline.calorieTarget * TRAINING_ADJUSTMENT_MAX_PCT,
  );
  const adjustedCalorieTarget = Math.round(baseline.calorieTarget + cappedIncrease);

  const adjustedProteinTargetG = applyProteinBoost(
    baseline.proteinTargetG,
    adj.proteinBoost as MacroBoostLevel,
  );
  const adjustedCarbsTargetG = applyCarbBoost(
    baseline.carbsTargetG,
    adj.carbBoost as MacroBoostLevel,
  );
  const adjustedFatTargetG = applyFatChange(
    baseline.fatTargetG,
    adj.fatChange as MacroBoostLevel,
  );

  // Sanity check: ensure adjusted macros don't exceed adjusted calories by too much
  const macroKcal =
    adjustedProteinTargetG * KCAL_PER_G.protein +
    adjustedCarbsTargetG   * KCAL_PER_G.carbs +
    adjustedFatTargetG     * KCAL_PER_G.fat;

  // If macros overshoot by >10%, scale carbs down to fit
  if (macroKcal > adjustedCalorieTarget * 1.1) {
    const overKcal = macroKcal - adjustedCalorieTarget;
    const carbsReduction = Math.round(overKcal / KCAL_PER_G.carbs);
    return {
      adjustedCalorieTarget,
      adjustedProteinTargetG,
      adjustedCarbsTargetG: Math.max(0, adjustedCarbsTargetG - carbsReduction),
      adjustedFatTargetG,
    };
  }

  return {
    adjustedCalorieTarget,
    adjustedProteinTargetG,
    adjustedCarbsTargetG,
    adjustedFatTargetG,
  };
}
