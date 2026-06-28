// ─── Nutrition constants ─────────────────────────────────────────────────────

export const MIFFLIN_CONSTANTS = {
  male:   { s: 5 },
  female: { s: -161 },
  // Neutral formula: average of male/female offsets
  not_specified: { s: -78 },
} as const;

export const ACTIVITY_MULTIPLIERS = {
  sedentary:         1.2,
  lightly_active:    1.375,
  moderately_active: 1.55,
  very_active:       1.725,
} as const;

export const GOAL_CALORIE_OFFSETS = {
  fat_loss:     -400, // midpoint of -300 to -500 range
  maintain:     0,
  muscle_gain:  250,  // midpoint of +200 to +300 range
} as const;

// Protein target: g per kg bodyweight
export const PROTEIN_PER_KG = 2.0; // midpoint of 1.8–2.2 range

// Fat: percentage of total calories
export const FAT_CALORIES_PCT = 0.275; // midpoint of 25–30%

// Calories per gram of macronutrient
export const KCAL_PER_G = {
  protein: 4,
  carbs:   4,
  fat:     9,
} as const;

// ─── Training day adjustment caps ────────────────────────────────────────────

export const TRAINING_ADJUSTMENT_MAX_PCT = 0.60; // cap: +60% of base calories

export const TRAINING_ADJUSTMENTS = {
  strength: { caloriePct: 0.40, proteinBoost: 'high',     carbBoost: 'moderate', fatChange: 'stable'   },
  cardio:   { caloriePct: 0.30, proteinBoost: 'stable',   carbBoost: 'high',     fatChange: 'slight_down' },
  mixed:    { caloriePct: 0.35, proteinBoost: 'moderate', carbBoost: 'moderate', fatChange: 'stable'   },
  steps:    { caloriePct: 0.15, proteinBoost: 'stable',   carbBoost: 'slight',   fatChange: 'stable'   },
  rest:     { caloriePct: 0,    proteinBoost: 'stable',   carbBoost: 'stable',   fatChange: 'stable'   },
} as const;

// ─── App constants ────────────────────────────────────────────────────────────

export const APP_NAME = 'FoodTrack';

// Health Connect: Drive file search query
export const HC_DRIVE_SEARCH_QUERY = "name contains 'health_connect' and trashed = false";

// Open Food Facts API base URL
export const OPEN_FOOD_FACTS_API = 'https://world.openfoodfacts.org/api/v2/product';

// Claude model for meal analysis
export const AI_MODEL = 'claude-sonnet-4-6';

// Minimum confidence to show analysis result without warning
export const AI_MIN_CONFIDENCE: 'high' | 'medium' | 'low' = 'medium';
