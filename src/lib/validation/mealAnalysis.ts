import { z } from 'zod';

// Validates raw Claude API response before it touches any domain logic.
// Claude returns JSON — we strip markdown fences before parsing, then validate here.

const AIFoodItemSchema = z.object({
  name:               z.string().min(1),
  portion_description:z.string().min(1),
  quantity_g:         z.number().nonnegative(),
  calories:           z.number().nonnegative(),
  protein_g:          z.number().nonnegative(),
  carbs_g:            z.number().nonnegative(),
  fat_g:              z.number().nonnegative(),
  confidence:         z.enum(['high', 'medium', 'low']),
});

export const MealAnalysisResponseSchema = z.object({
  meal_name:       z.string().min(1),
  items:           z.array(AIFoodItemSchema).min(1),
  total_calories:  z.number().nonnegative(),
  total_protein_g: z.number().nonnegative(),
  total_carbs_g:   z.number().nonnegative(),
  total_fat_g:     z.number().nonnegative(),
  analysis_notes:  z.string(),
});

export type MealAnalysisResponse = z.infer<typeof MealAnalysisResponseSchema>;
export type AIFoodItem = z.infer<typeof AIFoodItemSchema>;

// ─── AI service request/response envelope ────────────────────────────────────

export const AICapabilitySchema = z.enum([
  'analyze_meal_photo',
  'analyze_meal_text',
  'interpret_barcode_product',
  'estimate_recipe',
  'nutrition_coaching',
]);

export const AIRequestSchema = z.object({
  capability:    AICapabilitySchema,
  payload:       z.record(z.unknown()),
  contextHints:  z.record(z.string()).optional(),
});

export type AICapability = z.infer<typeof AICapabilitySchema>;
export type AIRequest = z.infer<typeof AIRequestSchema>;
