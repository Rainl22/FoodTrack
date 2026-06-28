import { z } from 'zod';

const currentYear = new Date().getFullYear();

export const OnboardingSchema = z.object({
  name:        z.string().min(1, 'Name is required').max(100),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .refine((d) => {
      const year = parseInt(d.slice(0, 4));
      return year >= 1900 && year <= currentYear - 13;
    }, 'Must be at least 13 years old'),
  sex:         z.enum(['male', 'female', 'not_specified']),
  heightCm:    z.number().min(50).max(300),
  weightKg:    z.number().min(20).max(500),
  goal:        z.enum(['fat_loss', 'maintain', 'muscle_gain']),
  activityLevel: z.enum([
    'sedentary',
    'lightly_active',
    'moderately_active',
    'very_active',
  ]),
  weeklyTrainingDays: z.number().int().min(0).max(7),
});

export const ProfileUpdateSchema = OnboardingSchema.partial().extend({
  healthConnectEnabled: z.boolean().optional(),
});

export type OnboardingFormData = z.infer<typeof OnboardingSchema>;
export type ProfileUpdateData = z.infer<typeof ProfileUpdateSchema>;
