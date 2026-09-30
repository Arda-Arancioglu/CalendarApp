import React from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns';
import type { CalendarEvent } from '../../types/event';
import { EventItem } from './EventItem';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectCellDate: (date: Date) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  events,
  onSelectEvent,
  onSelectCellDate,
}) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="w-full bg-[#11131F] border border-[#272A3D] rounded-md overflow-hidden flex flex-col">
      {/* Weekday Header Row */}
      <div className="grid grid-cols-7 border-b border-[#272A3D] bg-[#161828]">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-2.5 text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider border-r last:border-r-0 border-[#272A3D]"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 auto-rows-fr bg-[#090A0F]">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isDayToday = isToday(day);

          // Get events matching this date
          const dayEvents = events.filter((evt) => {
            try {
              const eventDate = parseISO(evt.startTime);
              return isSameDay(eventDate, day);
            } catch {
              return false;
            }
          });

          return (
            <div
              key={day.toISOString()}
              onClick={() => onSelectCellDate(day)}
              className={`min-h-[110px] md:min-h-[130px] p-1.5 md:p-2 border-b border-r border-[#272A3D] transition-colors cursor-pointer group flex flex-col justify-between ${
                isCurrentMonth ? 'bg-[#11131F]/90 hover:bg-[#161828]' : 'bg-[#090A0F]/60 text-zinc-600'
              }`}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`inline-flex items-center justify-center text-xs font-semibold w-6 h-6 rounded-xs ${
                    isDayToday
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : isCurrentMonth
                      ? 'text-zinc-200 group-hover:text-white'
                      : 'text-zinc-600'
                  }`}
                >
                  {format(day, 'd')}
                </span>

                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-mono text-zinc-400 bg-[#1A1D2D] px-1.5 py-0.5 rounded-xs border border-[#272A3D]">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Day Events Stack */}
              <div className="flex-1 space-y-1 overflow-y-auto max-h-[85px] pr-0.5">
                {dayEvents.map((evt) => (
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
            </div>
          );
        })}
      </div>
    </div>
  );
};
