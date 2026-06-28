import { calculateBMR, calculateTDEE } from '../bmr';

// Fixed DOB for deterministic age calculation: 30 years old relative to test date
// Tests use a known-age approach rather than a fixed date to stay green over time
function dobForAge(age: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  return d.toISOString().slice(0, 10);
}

describe('calculateBMR', () => {
  it('calculates male BMR correctly at age 30', () => {
    // 10×80 + 6.25×180 − 5×30 + 5 = 800 + 1125 − 150 + 5 = 1780
    const bmr = calculateBMR({
      weightKg: 80, heightCm: 180, dateOfBirth: dobForAge(30), sex: 'male',
    });
    expect(bmr).toBe(1780);
  });

  it('calculates female BMR correctly at age 30', () => {
    // 10×60 + 6.25×165 − 5×30 − 161 = 600 + 1031.25 − 150 − 161 = 1320
    const bmr = calculateBMR({
      weightKg: 60, heightCm: 165, dateOfBirth: dobForAge(30), sex: 'female',
    });
    expect(bmr).toBe(1320);
  });

  it('calculates not_specified BMR between male and female', () => {
    const male   = calculateBMR({ weightKg: 70, heightCm: 170, dateOfBirth: dobForAge(25), sex: 'male' });
    const female = calculateBMR({ weightKg: 70, heightCm: 170, dateOfBirth: dobForAge(25), sex: 'female' });
    const neutral= calculateBMR({ weightKg: 70, heightCm: 170, dateOfBirth: dobForAge(25), sex: 'not_specified' });
    expect(neutral).toBeGreaterThan(female);
    expect(neutral).toBeLessThan(male);
  });
});

describe('calculateTDEE', () => {
  it('applies sedentary multiplier', () => {
    expect(calculateTDEE(1800, 'sedentary')).toBe(Math.round(1800 * 1.2));
  });

  it('applies very_active multiplier', () => {
    expect(calculateTDEE(1800, 'very_active')).toBe(Math.round(1800 * 1.725));
  });
});
