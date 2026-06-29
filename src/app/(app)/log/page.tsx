'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { Toast } from '@/components/ui';
import {
  LogMethodPicker,
  PhotoLogger,
  TextLogger,
  VoiceLogger,
  BarcodeLogger,
  MealConfirmCard,
  MealEditCard,
} from '@/components/logging';
import { useEntryActions } from '@/hooks/useEntryActions';
import { useDayStore } from '@/store/useDayStore';
import { useUserStore } from '@/store/useUserStore';
import { entryRepository } from '@/lib/firestore';
import type { MealAnalysisServiceResult } from '@/lib/ai/service';
import type { MealSlot, BarcodeProduct, Entry, FoodItem } from '@/types';

type LogPhase = 'pick' | 'capture' | 'confirm' | 'saving';
type LogMethod = 'photo' | 'text' | 'voice' | 'barcode';

function LogContent() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const activeDate    = useDayStore((s) => s.activeDate);
  const uid           = useUserStore((s) => s.user?.uid);
  const { createEntry, updateEntry } = useEntryActions();

  const preselectedSlot = searchParams.get('slot') as MealSlot | null;
  const editId          = searchParams.get('edit');

  const [phase, setPhase]               = useState<LogPhase>('pick');
  const [method, setMethod]             = useState<LogMethod | null>(null);
  const [result, setResult]             = useState<MealAnalysisServiceResult | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [error, setError]               = useState<string | null>(null);

  // Load existing entry when navigated to /log?edit=<id>
  useEffect(() => {
    if (!editId || !uid) return;
    entryRepository.getById(uid, editId).then((entry) => {
      if (!entry) { setError('Entry not found.'); return; }
      setEditingEntry(entry);
      setResult({
        name:   entry.name,
        items:  entry.items,
        aiMeta: entry.aiMeta ?? {
          model:         'manual',
          confidence:    'high',
          notes:         '',
          handReference: false,
        },
      });
      setPhase('confirm');
    }).catch(() => setError('Could not load entry for editing.'));
  }, [editId, uid]);

  function handlePickMethod(m: LogMethod) {
    setMethod(m);
    setPhase('capture');
    setError(null);
  }

  // Switch to text entry without going back through the picker
  function handleTypeInstead() {
    setMethod('text');
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

  // New entry flow
  async function handleConfirmNew(slot: MealSlot | undefined) {
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

  // Edit entry flow — receives updated items from MealEditCard
  async function handleConfirmEdit(slot: MealSlot | undefined, items: FoodItem[]) {
    if (!editingEntry) return;
    setPhase('saving');
    setError(null);
    try {
      await updateEntry(editingEntry.id, editingEntry.date, {
        name:  editingEntry.name,
        slot:  slot ?? editingEntry.slot,
        items,
      });
      router.replace('/today');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save changes. Please try again.');
      setPhase('confirm');
    }
  }

  function handleBack() {
    if (editingEntry) { router.replace('/today'); return; }
    if (phase === 'confirm' || phase === 'capture') {
      setPhase('pick');
      setMethod(null);
      setResult(null);
    }
  }

  const pageTitle =
    editingEntry        ? 'Edit meal' :
    phase === 'pick'    ? 'Log Meal' :
    phase === 'capture' && method === 'photo'  ? 'Take a photo' :
    phase === 'capture' && method === 'text'   ? 'Describe it' :
    phase === 'capture' && method === 'voice'  ? 'Speak your meal' :
    phase === 'capture' && method === 'barcode'? 'Scan barcode' :
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

          {phase === 'pick' && !editingEntry && (
            <LogMethodPicker onSelect={handlePickMethod} />
          )}

          {phase === 'capture' && method === 'photo' && (
            <PhotoLogger onResult={handleResult} onError={setError} onBack={handleBack} />
          )}

          {phase === 'capture' && method === 'text' && (
            <TextLogger onResult={handleResult} onError={setError} onBack={handleBack} />
          )}

          {phase === 'capture' && method === 'voice' && (
            <VoiceLogger
              onResult={handleResult}
              onError={setError}
              onBack={handleBack}
              onTypeInstead={handleTypeInstead}
            />
          )}

          {phase === 'capture' && method === 'barcode' && (
            <BarcodeLogger onResult={handleBarcodeResult} onError={setError} onBack={handleBack} />
          )}

          {/* Edit mode: full item editor */}
          {(phase === 'confirm' || phase === 'saving') && result && editingEntry && (
            <MealEditCard
              result={result}
              onConfirm={handleConfirmEdit}
              onDiscard={handleBack}
              isSaving={phase === 'saving'}
              initialSlot={editingEntry.slot ?? undefined}
            />
          )}

          {/* New entry mode: read-only confirm + slot picker */}
          {(phase === 'confirm' || phase === 'saving') && result && !editingEntry && (
            <MealConfirmCard
              result={result}
              onConfirm={handleConfirmNew}
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
