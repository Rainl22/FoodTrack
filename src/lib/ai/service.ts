import type { IAIProvider } from './providers/IAIProvider';
import type { AIRequest } from '@/lib/validation/mealAnalysis';
import type { AIMeta } from '@/types';
import {
  analyzeMealPhoto,
  analyzeMealText,
  type MealAnalysisResult,
} from './prompts/mealAnalysis';

export interface MealAnalysisServiceResult {
  name:   string;
  items:  MealAnalysisResult['items'];
  aiMeta: AIMeta;
}

export class AIService {
  constructor(private provider: IAIProvider) {}

  async handleRequest(request: AIRequest): Promise<MealAnalysisServiceResult> {
    switch (request.capability) {
      case 'analyze_meal_photo':
        return this.handleMealPhoto(request.payload);

      case 'analyze_meal_text':
        return this.handleMealText(request.payload);

      default:
        throw new Error(`Capability '${request.capability}' is not yet implemented`);
    }
  }

  private async handleMealPhoto(payload: Record<string, unknown>): Promise<MealAnalysisServiceResult> {
    const base64    = payload['base64']    as string;
    const mimeType  = (payload['mimeType'] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp') ?? 'image/jpeg';

    if (!base64) throw new Error('analyze_meal_photo requires payload.base64');

    const { result, model } = await analyzeMealPhoto(this.provider, base64, mimeType);
    return buildServiceResult(result, model);
  }

  private async handleMealText(payload: Record<string, unknown>): Promise<MealAnalysisServiceResult> {
    const description = payload['description'] as string;

    if (!description) throw new Error('analyze_meal_text requires payload.description');

    const { result, model } = await analyzeMealText(this.provider, description);
    return buildServiceResult(result, model);
  }
}

function buildServiceResult(
  result: MealAnalysisResult,
  model:  string,
): MealAnalysisServiceResult {
  const aiMeta: AIMeta = {
    model,
    confidence:    result.overallConfidence,
    notes:         result.analysisNotes,
    handReference: false,  // future: parse from analysis_notes or add field to schema
  };

  return { name: result.name, items: result.items, aiMeta };
}
