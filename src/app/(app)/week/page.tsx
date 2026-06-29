'use client';

import { TopBar } from '@/components/navigation/TopBar';
import { Card, Spinner } from '@/components/ui';
import { NutritionStatCard } from '@/components/nutrition';
import { useWeekData } from '@/hooks/useWeekData';
import { useUserStore } from '@/store/useUserStore';

export default function WeekPage() {
  const { days, isLoading, error } = useWeekData();
  const profile = useUserStore((s) => s.profile);

  const daysWithData = days.filter((d) => d.totals.calorieTotal > 0);

  function avg(fn: (d: (typeof days)[0]) => number): number {
    if (!daysWithData.length) return 0;
    return Math.round(daysWithData.reduce((s, d) => s + fn(d), 0) / daysWithData.length);
  }

  const avgCalories = avg((d) => d.totals.calorieTotal);
  const avgProtein  = avg((d) => d.totals.proteinTotalG);
  const avgCarbs    = avg((d) => d.totals.carbsTotalG);
  const avgFat      = avg((d) => d.totals.fatTotalG);

  return (
    <>
      <TopBar title="This Week" />
      <div className="pt-[56px] pb-[68px] px-4 space-y-4">
        <div className="pt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <Card padding="md">
              <p className="text-sm text-error">{error}</p>
            </Card>
          ) : (
            <>
              <p className="text-xs text-text-secondary uppercase tracking-wide mb-3">
                7-day averages — {daysWithData.length} day{daysWithData.length !== 1 ? 's' : ''} logged
              </p>

              <div className="grid grid-cols-2 gap-3">
                <NutritionStatCard
                  label="Avg Calories"
                  value={avgCalories}
                  unit="kcal"
                  target={profile?.targets.calorieTarget}
                  className="col-span-2"
                />
                <NutritionStatCard
                  label="Avg Protein"
                  value={avgProtein}
                  unit="g"
                  target={profile?.targets.proteinTargetG}
                  color="bg-macro-protein"
                />
                <NutritionStatCard
                  label="Avg Carbs"
                  value={avgCarbs}
                  unit="g"
                  target={profile?.targets.carbsTargetG}
                  color="bg-macro-carbs"
                />
                <NutritionStatCard
                  label="Avg Fat"
                  value={avgFat}
                  unit="g"
                  target={profile?.targets.fatTargetG}
                  color="bg-macro-fat"
                />
              </div>

              {daysWithData.length === 0 && (
                <Card padding="md" className="mt-4">
                  <p className="text-sm text-text-secondary text-center">
                    No data logged this week yet. Start from the Today tab.
                  </p>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
