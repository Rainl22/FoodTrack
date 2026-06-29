import { MealAnalysisResponseSchema, type MealAnalysisResponse } from '@/lib/validation/mealAnalysis';
import type { IAIProvider, AIProviderRequest } from '@/lib/ai/providers/IAIProvider';
import type { FoodItem, ConfidenceLevel } from '@/types';

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a precise nutrition analysis assistant. Your sole job is to estimate the nutritional content of a meal and return structured JSON.

Rules:
- Respond ONLY with valid JSON. No markdown fences, no preamble, no commentary.
- All weights are in grams. All calories are kcal.
- If a food item is ambiguous, use a reasonable common preparation (grilled, not fried; standard portion).
- Use a hand or common object in the image as a size reference when visible.
- Set confidence to "high" when you can clearly identify the food and portion, "medium" for reasonable estimates, "low" when guessing.
- analysis_notes: brief caveats about accuracy (1-2 sentences). Empty string if none.

Required JSON schema:
{
  "meal_name": "string — short descriptive name",
  "items": [
    {
      "name": "string",
      "portion_description": "string — e.g. '2 large eggs', '150g grilled chicken'",
      "quantity_g": number,
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "total_calories": number,
  "total_protein_g": number,
  "total_carbs_g": number,
  "total_fat_g": number,
  "analysis_notes": "string"
}`;

// ─── Request builders ─────────────────────────────────────────────────────────

export function buildPhotoRequest(
  base64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
): AIProviderRequest {
  return {
    systemPrompt:  SYSTEM_PROMPT,
    userMessage:   'Analyze the meal in this photo and return the JSON nutrition breakdown.',
    imageBase64:   base64,
    imageMimeType: mimeType,
  };
}

export function buildTextRequest(description: string): AIProviderRequest {
  return {
    systemPrompt: SYSTEM_PROMPT,
    userMessage:  `Analyze this meal and return the JSON nutrition breakdown:\n\n${description}`,
  };
}

// ─── Result type ──────────────────────────────────────────────────────────────

export interface MealAnalysisResult {
  name:              string;
  items:             FoodItem[];
  analysisNotes:     string;
  overallConfidence: ConfidenceLevel;
}

// ─── Response mapper ──────────────────────────────────────────────────────────

const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = { high: 2, medium: 1, low: 0 };

function lowestConfidence(items: MealAnalysisResponse['items']): ConfidenceLevel {
  return items.reduce<ConfidenceLevel>((acc, item) => {
    return CONFIDENCE_RANK[item.confidence] < CONFIDENCE_RANK[acc] ? item.confidence : acc;
  }, 'high');
}

export function mapResponse(raw: unknown): MealAnalysisResult {
  const parsed = MealAnalysisResponseSchema.parse(raw);

  const items: FoodItem[] = parsed.items.map(item => ({
    name:               item.name,
    portionDescription: item.portion_description,
    quantityG:          item.quantity_g,
    calories:           item.calories,
    proteinG:           item.protein_g,
    carbsG:             item.carbs_g,
    fatG:               item.fat_g,
    confidence:         item.confidence,
  }));

  return {
    name:              parsed.meal_name,
    items,
    analysisNotes:     parsed.analysis_notes,
    overallConfidence: lowestConfidence(parsed.items),
  };
}

// ─── Convenience: run the full capability through a provider ──────────────────

export async function analyzeMealPhoto(
  provider: IAIProvider,
  base64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
): Promise<{ result: MealAnalysisResult; model: string }> {
  const providerResponse = await provider.complete(buildPhotoRequest(base64, mimeType));
  const raw = JSON.parse(stripMarkdownFences(providerResponse.text));
  return { result: mapResponse(raw), model: providerResponse.model };
}

export async function analyzeMealText(
  provider: IAIProvider,
  description: string,
): Promise<{ result: MealAnalysisResult; model: string }> {
  const providerResponse = await provider.complete(buildTextRequest(description));
  const raw = JSON.parse(stripMarkdownFences(providerResponse.text));
  return { result: mapResponse(raw), model: providerResponse.model };
}

// Strip ```json ... ``` fences that some models include despite instructions.
function stripMarkdownFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
}
