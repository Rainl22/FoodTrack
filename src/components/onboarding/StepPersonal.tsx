'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Chip } from '@/components/ui';
import type { BiologicalSex } from '@/types';

const schema = z.object({
  name:        z.string().min(1, 'Name is required').max(100),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
    .refine((d) => {
      const year = parseInt(d.slice(0, 4));
      const now  = new Date().getFullYear();
      return year >= 1900 && year <= now - 13;
    }, 'Must be at least 13 years old'),
  sex: z.enum(['male', 'female', 'not_specified'] as const),
});

type FormData = z.infer<typeof schema>;

const SEX_OPTIONS: { value: BiologicalSex; label: string }[] = [
  { value: 'male',          label: 'Male' },
  { value: 'female',        label: 'Female' },
  { value: 'not_specified', label: 'Prefer not to say' },
];

interface StepPersonalProps {
  defaultValues?: Partial<FormData>;
  onNext: (data: FormData) => void;
}

export function StepPersonal({ defaultValues, onNext }: StepPersonalProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { sex: 'not_specified', ...defaultValues },
  });
  const sex = watch('sex');

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-text-primary">About you</h2>
        <p className="text-sm text-text-secondary mt-1">We use this to personalise your calorie targets.</p>
      </div>

      <Input
        label="Your name"
        placeholder="Alex"
        error={errors.name?.message}
        {...register('name')}
      />

      <Input
        label="Date of birth"
        type="date"
        error={errors.dateOfBirth?.message}
        {...register('dateOfBirth')}
      />

      <div>
        <p className="text-sm font-medium text-text-primary mb-2">Biological sex</p>
        <div className="flex flex-wrap gap-2">
          {SEX_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              selected={sex === o.value}
              onClick={() => setValue('sex', o.value)}
            >
              {o.label}
            </Chip>
          ))}
        </div>
        {errors.sex && <p className="text-xs text-error mt-1">{errors.sex.message}</p>}
      </div>

      <Button type="submit" variant="primary" fullWidth>
        Continue
      </Button>
    </form>
  );
}
