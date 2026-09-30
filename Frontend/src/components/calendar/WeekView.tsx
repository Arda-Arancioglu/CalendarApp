import React from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns';
import type { CalendarEvent } from '../../types/event';
import { EventItem } from './EventItem';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectCellDate: (date: Date) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  events,
  onSelectEvent,
  onSelectCellDate,
}) => {
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(weekStart);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="w-full bg-[#11131F] border border-[#272A3D] rounded-md overflow-hidden flex flex-col">
      {/* Week Header Row */}
      <div className="grid grid-cols-8 border-b border-[#272A3D] bg-[#161828]">
        {/* Time label column header */}
        <div className="py-3 px-2 text-center text-[11px] font-mono text-zinc-500 uppercase border-r border-[#272A3D]">
          Time
        </div>
        {/* Days headers */}
        {days.map((day) => {
          const isDayToday = isToday(day);
          return (
            <div
              key={day.toISOString()}
              onClick={() => onSelectCellDate(day)}
              className="py-2.5 px-2 text-center border-r last:border-r-0 border-[#272A3D] cursor-pointer hover:bg-[#1A1D2D] transition-colors"
            >
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                {format(day, 'EEE')}
              </div>
              <div
                className={`inline-flex items-center justify-center text-sm font-bold mt-0.5 px-2 py-0.5 rounded-xs ${
                  isDayToday ? 'bg-indigo-600 text-white' : 'text-zinc-200'
                }`}
              >
                {format(day, 'MMM d')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hourly Grid Body */}
      <div className="max-h-[600px] overflow-y-auto divide-y divide-[#272A3D] bg-[#090A0F]">
        {HOURS.map((hour) => {
          const hourLabel = `${hour.toString().padStart(2, '0')}:00`;

          return (
            <div key={hour} className="grid grid-cols-8 min-h-[52px]">
              {/* Hour Label */}
              <div className="p-2 text-center text-xs font-mono text-zinc-500 border-r border-[#272A3D] bg-[#11131F]/60 flex items-center justify-center select-none">
                {hourLabel}
              </div>

              {/* 7 Day Slot Cells */}
              {days.map((day) => {
                const cellEvents = events.filter((evt) => {
                  try {
                    const evtStart = parseISO(evt.startTime);
                    return isSameDay(evtStart, day) && evtStart.getHours() === hour;
                  } catch {
                    return false;
                  }
                });

                return (
                  <div
                    key={day.toISOString() + hour}
                    onClick={() => {
                      const cellDate = new Date(day);
                      cellDate.setHours(hour, 0, 0, 0);
                      onSelectCellDate(cellDate);
                    }}
                    className="p-1 border-r last:border-r-0 border-[#272A3D] bg-[#11131F]/90 hover:bg-[#161828] transition-colors cursor-pointer space-y-1"
                  >
                    {cellEvents.map((evt) => (
                      <EventItem
                        key={evt.id}
                        event={evt}
                        onClick={(event, e) => {
                          e.stopPropagation();
                          onSelectEvent(event);
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
