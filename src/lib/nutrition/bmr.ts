/**
 * BMR and TDEE calculations — pure functions, no side effects.
 * Formula: Mifflin-St Jeor
 *   Male:          (10 × weight_kg) + (6.25 × height_cm) − (5 × age_years) + 5
 *   Female:        (10 × weight_kg) + (6.25 × height_cm) − (5 × age_years) − 161
 *   Not specified: average of male/female offsets → −78
 */

import type { BiologicalSex, ActivityLevel } from '@/types/user';
import { MIFFLIN_CONSTANTS, ACTIVITY_MULTIPLIERS } from '@/config/constants';

function ageFromDob(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function calculateBMR(params: {
  weightKg:    number;
  heightCm:    number;
  dateOfBirth: string;
  sex:         BiologicalSex;
}): number {
  const age = ageFromDob(params.dateOfBirth);
  const { s } = MIFFLIN_CONSTANTS[params.sex];
  const bmr =
    10 * params.weightKg +
    6.25 * params.heightCm -
    5 * age +
    s;
  return Math.round(bmr);
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}
