/**
 * Derive daily/entry totals from food items.
 * Pure functions — used both client-side and in the repository before writes.
 */

import type { FoodItem, Entry, MacroTotals } from '@/types/nutrition';

export function sumItems(items: FoodItem[]): MacroTotals {
  return items.reduce(
    (acc, item) => ({
      calorieTotal:  acc.calorieTotal  + item.calories,
      proteinTotalG: acc.proteinTotalG + item.proteinG,
      carbsTotalG:   acc.carbsTotalG   + item.carbsG,
      fatTotalG:     acc.fatTotalG     + item.fatG,
    }),
    { calorieTotal: 0, proteinTotalG: 0, carbsTotalG: 0, fatTotalG: 0 },
  );
}

export function sumEntries(entries: Entry[]): MacroTotals {
  return entries.reduce(
    (acc, entry) => ({
      calorieTotal:  acc.calorieTotal  + entry.totalCalories,
      proteinTotalG: acc.proteinTotalG + entry.totalProteinG,
      carbsTotalG:   acc.carbsTotalG   + entry.totalCarbsG,
      fatTotalG:     acc.fatTotalG     + entry.totalFatG,
    }),
    { calorieTotal: 0, proteinTotalG: 0, carbsTotalG: 0, fatTotalG: 0 },
  );
}

/** Round macro values to one decimal place for display. */
export function roundTotals(totals: MacroTotals): MacroTotals {
  return {
    calorieTotal:  Math.round(totals.calorieTotal),
    proteinTotalG: Math.round(totals.proteinTotalG * 10) / 10,
    carbsTotalG:   Math.round(totals.carbsTotalG   * 10) / 10,
    fatTotalG:     Math.round(totals.fatTotalG     * 10) / 10,
  };
}
