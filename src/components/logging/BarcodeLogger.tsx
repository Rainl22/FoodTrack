'use client';

import { useState } from 'react';
import { useZxing } from 'react-zxing';
import { Button, Spinner } from '@/components/ui';
import type { BarcodeProduct } from '@/types';

interface BarcodeLoggerProps {
  onResult: (product: BarcodeProduct) => void;
  onError:  (error: string) => void;
  onBack:   () => void;
}

interface OFFProduct {
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: {
    'energy-kcal_100g'?:  number;
    'proteins_100g'?:     number;
    'carbohydrates_100g'?: number;
    'fat_100g'?:          number;
  };
}

interface OFFResponse {
  status: number;
  product?: OFFProduct;
}

async function fetchProduct(barcode: string): Promise<BarcodeProduct> {
  const res  = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
  const data = (await res.json()) as OFFResponse;
  if (data.status !== 1 || !data.product) {
    throw new Error('Product not found in Open Food Facts');
  }
  const p = data.product;
  const n = p.nutriments ?? {};
  return {
    barcode,
    name:       p.product_name ?? 'Unknown product',
    brand:      p.brands,
    per100g: {
      calories: n['energy-kcal_100g']  ?? 0,
      proteinG: n['proteins_100g']     ?? 0,
      carbsG:   n['carbohydrates_100g'] ?? 0,
      fatG:     n['fat_100g']          ?? 0,
    },
    servingSizeG: p.serving_size ? parseFloat(p.serving_size) || undefined : undefined,
  };
}

export function BarcodeLogger({ onResult, onError, onBack }: BarcodeLoggerProps) {
  const [isFetching, setIsFetching] = useState(false);
  const [scanned, setScanned]       = useState(false);

  const { ref } = useZxing({
    paused: isFetching || scanned,
    onDecodeResult: async (result) => {
      const code = result.getText();
      if (!code || scanned) return;
      setScanned(true);
      setIsFetching(true);
      try {
        const product = await fetchProduct(code);
        onResult(product);
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Barcode lookup failed');
        setScanned(false);
      } finally {
        setIsFetching(false);
      }
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="relative rounded-card overflow-hidden bg-black aspect-[4/3]">
        <video ref={ref} className="w-full h-full object-cover" />
        {isFetching && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Spinner size="lg" color="white" />
          </div>
        )}
        <div className="absolute inset-0 border-2 border-brand-400/50 rounded-card pointer-events-none" />
      </div>

      <p className="text-sm text-text-secondary text-center">
        Point the camera at a barcode to look it up
      </p>

      <Button variant="ghost" onClick={onBack} fullWidth>
        Back
      </Button>
    </div>
  );
}
