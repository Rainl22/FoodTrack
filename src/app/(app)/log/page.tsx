'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { Toast } from '@/components/ui';
import {
  LogMethodPicker,
  PhotoLogger,
  TextLogger,
  BarcodeLogger,
  MealConfirmCard,
} from '@/components/logging';
import { useEntryActions } from '@/hooks/useEntryActions';
import { useDayStore } from '@/store/useDayStore';
import type { MealAnalysisServiceResult } from '@/lib/ai/service';
import type { MealSlot, BarcodeProduct } from '@/types';

type LogPhase = 'pick' | 'capture' | 'confirm' | 'saving';
type LogMethod = 'photo' | 'text' | 'barcode';

function LogContent() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const activeDate    = useDayStore((s) => s.activeDate);
  const { createEntry } = useEntryActions();

  const preselectedSlot = searchParams.get('slot') as MealSlot | null;

  const [phase, setPhase]   = useState<LogPhase>('pick');
  const [method, setMethod] = useState<LogMethod | null>(null);
  const [result, setResult] = useState<MealAnalysisServiceResult | null>(null);
  const [error, setError]   = useState<string | null>(null);

  function handlePickMethod(m: LogMethod) {
    setMethod(m);
    setPhase('capture');
    setError(null);
  }

  function handleResult(r: MealAnalysisServiceResult) {
    setResult(r);
    setPhase('confirm');
    setError(null);
  }

  function handleBarcodeResult(product: BarcodeProduct) {
    const aiResult: MealAnalysisServiceResult = {
      name:   product.brand ? `${product.brand} ${product.name}` : product.name,
      items:  [
        {
          name:               product.name,
          portionDescription: product.servingSizeG ? `${product.servingSizeG}g serving` : '100g',
          quantityG:          product.servingSizeG ?? 100,
          calories:           product.per100g.calories * ((product.servingSizeG ?? 100) / 100),
          proteinG:           product.per100g.proteinG * ((product.servingSizeG ?? 100) / 100),
          carbsG:             product.per100g.carbsG * ((product.servingSizeG ?? 100) / 100),
          fatG:               product.per100g.fatG * ((product.servingSizeG ?? 100) / 100),
          confidence:         'high' as const,
          barcode:            product.barcode,
          brand:              product.brand,
        },
      ],
      aiMeta: {
        model:         'open-food-facts',
        confidence:    'high',
        notes:         'Nutritional data from Open Food Facts database',
        handReference: false,
      },
    };
    setResult(aiResult);
    setPhase('confirm');
    setError(null);
  }

  async function handleConfirm(slot: MealSlot | undefined) {
    if (!result) return;
    setPhase('saving');
    setError(null);
    try {
      await createEntry({
        type:        'meal',
        slot:        slot ?? undefined,
        name:        result.name,
        date:        activeDate,
        timestamp:   new Date().toISOString(),
        items:       result.items,
        inputMethod: method === 'barcode' ? 'barcode' : method === 'photo' ? 'photo' : 'text',
        aiMeta:      result.aiMeta,
      });
      router.replace('/today');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save entry. Please try again.');
      setPhase('confirm');
    }
  }

  function handleBack() {
    if (phase === 'confirm' || phase === 'capture') {
      setPhase('pick');
      setMethod(null);
      setResult(null);
    }
  }

  const pageTitle =
    phase === 'pick'    ? 'Log Meal' :
    phase === 'capture' ? (method === 'photo' ? 'Take a photo' : method === 'text' ? 'Describe it' : 'Scan barcode') :
    phase === 'confirm' ? 'Confirm meal' :
    'Saving…';

  return (
    <>
      <TopBar title={pageTitle} />
      <div className="pt-[56px] pb-[68px] px-4 space-y-4">
        <div className="pt-4">
          {error && (
            <Toast severity="error" message={error} onDismiss={() => setError(null)} className="mb-4" />
          )}

          {phase === 'pick' && (
            <LogMethodPicker onSelect={handlePickMethod} />
          )}

          {phase === 'capture' && method === 'photo' && (
            <PhotoLogger
              onResult={handleResult}
              onError={setError}
              onBack={handleBack}
            />
          )}

          {phase === 'capture' && method === 'text' && (
            <TextLogger
              onResult={handleResult}
              onError={setError}
              onBack={handleBack}
            />
          )}

          {phase === 'capture' && method === 'barcode' && (
            <BarcodeLogger
              onResult={handleBarcodeResult}
              onError={setError}
              onBack={handleBack}
            />
          )}

          {(phase === 'confirm' || phase === 'saving') && result && (
            <MealConfirmCard
              result={result}
              onConfirm={handleConfirm}
              onDiscard={handleBack}
              isSaving={phase === 'saving'}
              initialSlot={preselectedSlot ?? undefined}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default function LogPage() {
  return (
    <Suspense>
      <LogContent />
    </Suspense>
  );
}
