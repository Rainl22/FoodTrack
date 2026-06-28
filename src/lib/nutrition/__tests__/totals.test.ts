import { sumItems, sumEntries } from '../totals';
import type { FoodItem, Entry } from '@/types/nutrition';

const egg: FoodItem = {
  name: 'Egg', portionDescription: '1 large', quantityG: 50,
  calories: 70, proteinG: 6, carbsG: 0.5, fatG: 5,
};
const toast: FoodItem = {
  name: 'Toast', portionDescription: '1 slice', quantityG: 30,
  calories: 80, proteinG: 3, carbsG: 15, fatG: 1,
};

describe('sumItems', () => {
  it('sums a single item', () => {
    expect(sumItems([egg])).toEqual({
      calorieTotal: 70, proteinTotalG: 6, carbsTotalG: 0.5, fatTotalG: 5,
    });
  });

  it('sums multiple items', () => {
    const result = sumItems([egg, toast]);
    expect(result.calorieTotal).toBe(150);
    expect(result.proteinTotalG).toBe(9);
    expect(result.carbsTotalG).toBeCloseTo(15.5);
    expect(result.fatTotalG).toBe(6);
  });

  it('returns zeros for empty array', () => {
    expect(sumItems([])).toEqual({
      calorieTotal: 0, proteinTotalG: 0, carbsTotalG: 0, fatTotalG: 0,
    });
  });
});

describe('sumEntries', () => {
  const base: Omit<Entry, 'id' | 'totalCalories' | 'totalProteinG' | 'totalCarbsG' | 'totalFatG'> = {
    type: 'meal', name: 'Breakfast', date: '2025-01-01', timestamp: '2025-01-01T08:00:00Z',
    items: [], inputMethod: 'manual', createdAt: '2025-01-01T08:00:00Z', updatedAt: '2025-01-01T08:00:00Z',
  };

  it('sums entries totals', () => {
    const entries: Entry[] = [
      { ...base, id: '1', totalCalories: 300, totalProteinG: 20, totalCarbsG: 30, totalFatG: 10 },
      { ...base, id: '2', totalCalories: 500, totalProteinG: 40, totalCarbsG: 50, totalFatG: 20 },
    ];
    expect(sumEntries(entries)).toEqual({
      calorieTotal: 800, proteinTotalG: 60, carbsTotalG: 80, fatTotalG: 30,
    });
  });
});
