import { z } from 'zod';

export const FoodItemSchema = z.object({
  name:               z.string().min(1),
  portionDescription: z.string().min(1),
  quantityG:          z.number().nonnegative(),
  calories:           z.number().nonnegative(),
  proteinG:           z.number().nonnegative(),
  carbsG:             z.number().nonnegative(),
  fatG:               z.number().nonnegative(),
  confidence:         z.enum(['high', 'medium', 'low']).optional(),
  barcode:            z.string().optional(),
  brand:              z.string().optional(),
});

export const AIMetaSchema = z.object({
  model:         z.string().min(1),
  confidence:    z.enum(['high', 'medium', 'low']),
  notes:         z.string(),
  handReference: z.boolean(),
});

export const EntrySchema = z.object({
  id:        z.string().min(1),
  type:      z.enum(['meal', 'drink', 'supplement', 'snack', 'recipe']),
  slot:      z.enum(['breakfast', 'lunch', 'dinner', 'snacks']).optional(),
  name:      z.string().min(1),
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timestamp: z.string().datetime(),
  items:     z.array(FoodItemSchema).min(1),
  totalCalories:  z.number().nonnegative(),
  totalProteinG:  z.number().nonnegative(),
  totalCarbsG:    z.number().nonnegative(),
  totalFatG:      z.number().nonnegative(),
  inputMethod: z.enum(['photo', 'text', 'barcode', 'manual']),
  photoUrl:    z.string().url().optional(),
  notes:       z.string().optional(),
  aiMeta:      AIMetaSchema.optional(),
  createdAt:   z.string().datetime(),
  updatedAt:   z.string().datetime(),
});

export const DayActivitySchema = z.object({
  steps:              z.number().nonnegative(),
  activeCaloriesKcal: z.number().nonnegative(),
  trainingDay:        z.boolean(),
  trainingType:       z.enum(['strength', 'cardio', 'mixed', 'rest']).optional(),
  workoutCount:       z.number().nonnegative(),
  totalDurationMin:   z.number().nonnegative(),
});

// Input validation for creating a new entry (id, createdAt, updatedAt are server-assigned)
export const CreateEntryInputSchema = EntrySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalCalories: true,
  totalProteinG: true,
  totalCarbsG: true,
  totalFatG: true,
}).extend({
  // totals are computed server-side from items
  items: z.array(FoodItemSchema).min(1),
});

export type CreateEntryInput = z.infer<typeof CreateEntryInputSchema>;
export type ValidatedEntry = z.infer<typeof EntrySchema>;
export type ValidatedFoodItem = z.infer<typeof FoodItemSchema>;
