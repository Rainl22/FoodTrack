'use client';

import { useState } from 'react';
import { Button, Spinner } from '@/components/ui';
import { callAI } from '@/lib/ai/client';
import type { MealAnalysisServiceResult } from '@/lib/ai/service';

interface TextLoggerProps {
  onResult: (result: MealAnalysisServiceResult) => void;
  onError:  (error: string) => void;
  onBack:   () => void;
}

export function TextLogger({ onResult, onError, onBack }: TextLoggerProps) {
  const [text, setText]           = useState('');
  const [isAnalysing, setIsAnalysing] = useState(false);

  async function handleAnalyse() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setIsAnalysing(true);
    try {
      const result = await callAI({
        capability: 'analyze_meal_text',
        payload:    { description: trimmed },
      });
      onResult(result);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not analyse description');
    } finally {
      setIsAnalysing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="meal-description" className="block text-sm font-medium text-text-primary mb-2">
          Describe what you ate
        </label>
        <textarea
          id="meal-description"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. 200g chicken breast with rice and broccoli, olive oil dressing"
          rows={5}
          className="w-full px-4 py-3 rounded-input border border-surface-input bg-surface-page text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none text-sm"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Button
          variant="primary"
          onClick={handleAnalyse}
          disabled={!text.trim() || isAnalysing}
          fullWidth
        >
          {isAnalysing ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" color="white" />
              Analysing…
            </span>
          ) : (
            'Analyse meal'
          )}
        </Button>
        <Button variant="ghost" onClick={onBack} fullWidth>
          Back
        </Button>
      </div>
    </div>
  );
}
