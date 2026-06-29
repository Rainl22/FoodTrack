import { MealAnalysisResponseSchema } from '@/lib/validation/mealAnalysis';
import { mapResponse, buildPhotoRequest, buildTextRequest } from '@/lib/ai/prompts/mealAnalysis';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_RESPONSE = {
  meal_name:       'Grilled chicken with rice',
  items: [
    {
      name:                'Grilled chicken breast',
      portion_description: '150g grilled chicken',
      quantity_g:          150,
      calories:            248,
      protein_g:           46.5,
      carbs_g:             0,
      fat_g:               5.4,
      confidence:          'high',
    },
    {
      name:                'White rice',
      portion_description: '200g cooked white rice',
      quantity_g:          200,
      calories:            260,
      protein_g:           4.8,
      carbs_g:             57.2,
      fat_g:               0.4,
      confidence:          'medium',
    },
  ],
  total_calories:  508,
  total_protein_g: 51.3,
  total_carbs_g:   57.2,
  total_fat_g:     5.8,
  analysis_notes:  'Portion size estimated from standard serving.',
};

// ─── Schema validation ────────────────────────────────────────────────────────

describe('MealAnalysisResponseSchema', () => {
  it('accepts a valid response', () => {
    expect(() => MealAnalysisResponseSchema.parse(VALID_RESPONSE)).not.toThrow();
  });

  it('rejects a response with no items', () => {
    const bad = { ...VALID_RESPONSE, items: [] };
    expect(() => MealAnalysisResponseSchema.parse(bad)).toThrow();
  });

  it('rejects a response with a negative calorie value', () => {
    const bad = {
      ...VALID_RESPONSE,
      items: [{ ...VALID_RESPONSE.items[0], calories: -10 }],
    };
    expect(() => MealAnalysisResponseSchema.parse(bad)).toThrow();
  });

  it('rejects an invalid confidence level', () => {
    const bad = {
      ...VALID_RESPONSE,
      items: [{ ...VALID_RESPONSE.items[0], confidence: 'very_high' }],
    };
    expect(() => MealAnalysisResponseSchema.parse(bad)).toThrow();
  });

  it('rejects a missing required field', () => {
    const { meal_name: _, ...bad } = VALID_RESPONSE;
    expect(() => MealAnalysisResponseSchema.parse(bad)).toThrow();
  });
});

// ─── Mapper ───────────────────────────────────────────────────────────────────

describe('mapResponse', () => {
  it('maps meal_name to name', () => {
    const result = mapResponse(VALID_RESPONSE);
    expect(result.name).toBe('Grilled chicken with rice');
  });

  it('converts snake_case AI fields to camelCase FoodItem fields', () => {
    const result = mapResponse(VALID_RESPONSE);
    const item   = result.items[0];
    expect(item.portionDescription).toBe('150g grilled chicken');
    expect(item.quantityG).toBe(150);
    expect(item.proteinG).toBe(46.5);
    expect(item.carbsG).toBe(0);
    expect(item.fatG).toBe(5.4);
  });

  it('preserves item count', () => {
    const result = mapResponse(VALID_RESPONSE);
    expect(result.items).toHaveLength(2);
  });

  it('sets overallConfidence to the lowest item confidence', () => {
    // items are high + medium → overall should be medium
    const result = mapResponse(VALID_RESPONSE);
    expect(result.overallConfidence).toBe('medium');
  });

  it('sets overallConfidence to low when any item is low', () => {
    const withLow = {
      ...VALID_RESPONSE,
      items: [
        { ...VALID_RESPONSE.items[0], confidence: 'high'   as const },
        { ...VALID_RESPONSE.items[1], confidence: 'low'    as const },
      ],
    };
    const result = mapResponse(withLow);
    expect(result.overallConfidence).toBe('low');
  });

  it('sets overallConfidence to high when all items are high', () => {
    const allHigh = {
      ...VALID_RESPONSE,
      items: VALID_RESPONSE.items.map(i => ({ ...i, confidence: 'high' as const })),
    };
    const result = mapResponse(allHigh);
    expect(result.overallConfidence).toBe('high');
  });

  it('forwards analysisNotes', () => {
    const result = mapResponse(VALID_RESPONSE);
    expect(result.analysisNotes).toBe('Portion size estimated from standard serving.');
  });

  it('throws on an invalid response', () => {
    expect(() => mapResponse({ meal_name: 'x', items: [] })).toThrow();
  });
});

// ─── Request builders ─────────────────────────────────────────────────────────

describe('buildPhotoRequest', () => {
  it('includes the base64 image and mimeType', () => {
    const req = buildPhotoRequest('abc123', 'image/jpeg');
    expect(req.imageBase64).toBe('abc123');
    expect(req.imageMimeType).toBe('image/jpeg');
    expect(req.systemPrompt).toContain('JSON');
    expect(req.userMessage).toContain('photo');
  });
});

describe('buildTextRequest', () => {
  it('embeds the description in the user message', () => {
    const req = buildTextRequest('2 eggs and toast');
    expect(req.userMessage).toContain('2 eggs and toast');
    expect(req.imageBase64).toBeUndefined();
  });
});
