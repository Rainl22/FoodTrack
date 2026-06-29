'use client';

import { cn } from '@/lib/utils';

type LogMethod = 'photo' | 'text' | 'barcode';

interface MethodOption {
  id:          LogMethod;
  label:       string;
  description: string;
}

const METHODS: MethodOption[] = [
  {
    id:          'photo',
    label:       'Take a photo',
    description: 'Snap your meal and let AI analyse it',
  },
  {
    id:          'text',
    label:       'Describe it',
    description: 'Type what you ate and get an estimate',
  },
  {
    id:          'barcode',
    label:       'Scan a barcode',
    description: 'Look up packaged food instantly',
  },
];

interface LogMethodPickerProps {
  onSelect: (method: LogMethod) => void;
}

export function LogMethodPicker({ onSelect }: LogMethodPickerProps) {
  return (
    <div className="flex flex-col gap-3">
      {METHODS.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onSelect(m.id)}
          className={cn(
            'flex flex-col items-start gap-0.5 w-full px-5 py-4 rounded-card',
            'bg-surface-card border border-surface-input shadow-card',
            'hover:border-brand-300 transition-colors text-left',
          )}
        >
          <span className="text-base font-semibold text-text-primary">{m.label}</span>
          <span className="text-sm text-text-secondary">{m.description}</span>
        </button>
      ))}
    </div>
  );
}
