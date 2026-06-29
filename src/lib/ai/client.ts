'use client';

import type { MealAnalysisServiceResult } from '@/lib/ai/service';

interface AIClientRequest {
  capability: 'analyze_meal_photo' | 'analyze_meal_text';
  payload: Record<string, unknown>;
}

export async function callAI(request: AIClientRequest): Promise<MealAnalysisServiceResult> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? `AI service error (${res.status})`);
  }
  return data.result as MealAnalysisServiceResult;
}
