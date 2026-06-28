// ─── Nutrition domain types ───────────────────────────────────────────────────

// Entry types — extensible without schema changes
export type EntryType = 'meal' | 'drink' | 'supplement' | 'snack' | 'recipe';

// Meal slot — optional, used for breakfast/lunch/dinner/snacks grouping
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

// How the entry was logged
export type InputMethod = 'photo' | 'text' | 'barcode' | 'manual';

// AI confidence level (used both in food items and at entry level)
export type ConfidenceLevel = 'high' | 'medium' | 'low';

// ─── Food item (one ingredient/product within an entry) ───────────────────────

export interface FoodItem {
  name:               string;
  portionDescription: string;  // human-readable: "2 large eggs", "150g chicken"
  quantityG:          number;  // grams
  calories:           number;  // kcal
  proteinG:           number;
  carbsG:             number;
  fatG:               number;
  confidence?:        ConfidenceLevel;
  barcode?:           string;  // EAN/UPC if scanned
  brand?:             string;  // from Open Food Facts
}

// ─── AI analysis metadata ─────────────────────────────────────────────────────

export interface AIMeta {
  model:         string;           // e.g. "claude-sonnet-4-6"
  confidence:    ConfidenceLevel;
  notes:         string;           // Claude's caveats / calibration notes
  handReference: boolean;          // whether hand was used as size reference
}

// ─── Entry — core domain object ───────────────────────────────────────────────
// Generic tracking unit. A meal is an Entry with type='meal' and a slot.
// A supplement is an Entry with type='supplement', no slot required.

export interface Entry {
  id:        string;
  type:      EntryType;
  slot?:     MealSlot;
  name:      string;

  // Timing — date is the accounting day, timestamp is the actual log time
  date:      string;  // YYYY-MM-DD
  timestamp: string;  // ISO datetime

  items:     FoodItem[];

  // Cached totals — always derivable from items, stored for read performance
  totalCalories:  number;
  totalProteinG:  number;
  totalCarbsG:    number;
  totalFatG:      number;

  inputMethod: InputMethod;
  photoUrl?:   string;   // Firebase Storage URL (present when inputMethod='photo')
  notes?:      string;

  aiMeta?: AIMeta;

  createdAt: string;
  updatedAt: string;
}

// ─── Daily aggregate ──────────────────────────────────────────────────────────
// Recomputable from Entry[]. Stored in Firestore as a cache for the week strip.

export interface MacroTotals {
  calorieTotal:  number;
  proteinTotalG: number;
  carbsTotalG:   number;
  fatTotalG:     number;
}

export interface AdjustedTargets {
  adjustedCalorieTarget:  number;
  adjustedProteinTargetG: number;
  adjustedCarbsTargetG:   number;
  adjustedFatTargetG:     number;
}

export interface DayActivity {
  steps:              number;
  activeCaloriesKcal: number;
  trainingDay:        boolean;
  trainingType?:      'strength' | 'cardio' | 'mixed' | 'rest';
  workoutCount:       number;
  totalDurationMin:   number;
}

export interface DayAggregate {
  date:            string;  // YYYY-MM-DD (also the Firestore doc ID)
  totals:          MacroTotals;
  adjustedTargets?: AdjustedTargets;  // null = use profile baseline
  activity?:       DayActivity;       // written by wearable sync
  lastComputedAt:  string;            // ISO datetime
}

// ─── Barcode lookup result (Open Food Facts) ──────────────────────────────────

export interface BarcodeProduct {
  barcode:  string;
  name:     string;
  brand?:   string;
  per100g:  Omit<FoodItem, 'name' | 'portionDescription' | 'quantityG' | 'barcode' | 'brand'>;
  servingSizeG?: number;
}
