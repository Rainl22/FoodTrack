'use client';

import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/navigation/TopBar';
import { Spinner } from '@/components/ui';
import {
  CalorieSummary,
  MacroRings,
  DayStrip,
  MealSlot,
  TrainingBanner,
} from '@/components/nutrition';
import { useProfile } from '@/hooks/useProfile';
import { useDayData } from '@/hooks/useDayData';
import { useWeekData } from '@/hooks/useWeekData';
import { useEntryActions } from '@/hooks/useEntryActions';
import { useUserStore } from '@/store/useUserStore';
import { useDayStore } from '@/store/useDayStore';
import type { MealSlot as MealSlotType } from '@/types';

const SLOTS: MealSlotType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const today = todayISO();
  if (dateStr === today) return 'Today';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function TodayPage() {
  const router       = useRouter();
  const profile      = useUserStore((s) => s.profile);
  const activeDate   = useDayStore((s) => s.activeDate);
  const entries      = useDayStore((s) => s.entries);
  const day          = useDayStore((s) => s.day);
  const isLoading    = useDayStore((s) => s.isLoading);
  const setActiveDate = useDayStore((s) => s.setActiveDate);

  useProfile();
  useDayData();
  const { days } = useWeekData();
  const { deleteEntry } = useEntryActions(); // updateEntry not needed here — edit navigates to /log

  function handleAddEntry(slot: MealSlotType) {
    router.push(`/log?slot=${slot}`);
  }

  function handleEditEntry(entryId: string) {
    router.push(`/log?edit=${entryId}`);
  }

  const targets = day?.adjustedTargets
    ? {
        calorieTarget:  day.adjustedTargets.adjustedCalorieTarget,
        proteinTargetG: day.adjustedTargets.adjustedProteinTargetG,
        carbsTargetG:   day.adjustedTargets.adjustedCarbsTargetG,
        fatTargetG:     day.adjustedTargets.adjustedFatTargetG,
      }
    : profile?.targets ?? {
        calorieTarget: 2000,
        proteinTargetG: 150,
        carbsTargetG: 200,
        fatTargetG: 60,
      };

  const totals = day?.totals ?? {
    calorieTotal:  0,
    proteinTotalG: 0,
    carbsTotalG:   0,
    fatTotalG:     0,
  };

  return (
    <>
      <TopBar title={formatDate(activeDate)} />

      <div className="pt-[56px] pb-[68px] px-4 space-y-4">
        <div className="pt-4">
          <DayStrip
            days={days}
            activeDate={activeDate}
            onDateSelect={setActiveDate}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {day?.activity?.trainingDay && day.adjustedTargets && (
              <TrainingBanner
                activity={day.activity}
                adjustedTargets={day.adjustedTargets}
              />
            )}

            <CalorieSummary totals={totals} targets={targets} />
            <MacroRings totals={totals} targets={targets} />

            {SLOTS.map((slot) => (
              <MealSlot
                key={slot}
                slot={slot}
                entries={entries.filter((e) => e.slot === slot)}
                onAdd={handleAddEntry}
                onEdit={(entryId) => handleEditEntry(entryId)}
                onDelete={(entryId, entryDate) => {
                  deleteEntry(entryId, entryDate).catch(() => {});
                }}
              />
            ))}
          </>
        )}
      </div>
    </>
  );
}
