'use client';

import { useRef, useState } from 'react';
import { Button, Spinner } from '@/components/ui';
import { callAI } from '@/lib/ai/client';
import type { MealAnalysisServiceResult } from '@/lib/ai/service';

interface PhotoLoggerProps {
  onResult: (result: MealAnalysisServiceResult) => void;
  onError:  (error: string) => void;
  onBack:   () => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PhotoLogger({ onResult, onError, onBack }: PhotoLoggerProps) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile]       = useState<File | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleAnalyse() {
    if (!file) return;
    setIsAnalysing(true);
    try {
      const base64    = await fileToBase64(file);
      const mimeType  = file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
      const result    = await callAI({
        capability: 'analyze_meal_photo',
        payload:    { base64, mimeType },
      });
      onResult(result);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not analyse photo');
    } finally {
      setIsAnalysing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Meal preview"
            className="w-full rounded-card object-cover max-h-64"
          />
          <button
            type="button"
            onClick={() => { setPreview(null); setFile(null); }}
            className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded"
          >
            Retake
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 w-full h-48 border-2 border-dashed border-surface-input rounded-card text-text-secondary hover:border-brand-300 hover:text-brand-500 transition-colors"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          <span className="text-sm font-medium">Tap to take a photo</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileChange}
      />

      <div className="flex flex-col gap-2">
        <Button
          variant="primary"
          onClick={handleAnalyse}
          disabled={!file || isAnalysing}
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
