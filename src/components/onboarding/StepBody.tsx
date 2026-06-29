'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@/components/ui';

const schema = z.object({
  heightCm: z.coerce.number().min(100, 'Height must be at least 100 cm').max(250),
  weightKg: z.coerce.number().min(20, 'Weight must be at least 20 kg').max(500),
});

type FormData = z.infer<typeof schema>;

interface StepBodyProps {
  defaultValues?: Partial<FormData>;
  onNext: (data: FormData) => void;
  onBack: () => void;
}

export function StepBody({ defaultValues, onNext, onBack }: StepBodyProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Body measurements</h2>
        <p className="text-sm text-text-secondary mt-1">Used to calculate your basal metabolic rate.</p>
      </div>

      <Input
        label="Height (cm)"
        type="number"
        inputMode="decimal"
        placeholder="175"
        error={errors.heightCm?.message}
        {...register('heightCm')}
      />

      <Input
        label="Weight (kg)"
        type="number"
        inputMode="decimal"
        placeholder="70"
        error={errors.weightKg?.message}
        {...register('weightKg')}
      />

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack} fullWidth>
          Back
        </Button>
        <Button type="submit" variant="primary" fullWidth>
          Continue
        </Button>
      </div>
    </form>
  );
}
