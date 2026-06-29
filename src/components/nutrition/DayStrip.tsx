'use client';

import { DayTile } from './DayTile';
import type { DayAggregate } from '@/types';

interface DayStripProps {
  days:           DayAggregate[];
  activeDate:     string;
  onDateSelect:   (date: string) => void;
}

function getLast7Dates(): string[] {
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export function DayStrip({ days, activeDate, onDateSelect }: DayStripProps) {
  const dates  = getLast7Dates();
  const dayMap = Object.fromEntries(days.map((d) => [d.date, d]));

  return (
    <div className="flex overflow-x-auto gap-1 pb-1 -mx-4 px-4 scrollbar-hide">
      {dates.map((date) => (
        <DayTile
          key={date}
          date={date}
          day={dayMap[date]}
          isActive={date === activeDate}
          onClick={() => onDateSelect(date)}
        />
      ))}
    </div>
  );
}
