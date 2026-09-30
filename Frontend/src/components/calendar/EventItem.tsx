import React from 'react';
import type { CalendarEvent } from '../../types/event';
import { format, parseISO } from 'date-fns';

interface EventItemProps {
  event: CalendarEvent;
  onClick: (event: CalendarEvent, e: React.MouseEvent) => void;
}

export const EventItem: React.FC<EventItemProps> = ({ event, onClick }) => {
  const startTimeObj = parseISO(event.startTime);
  const formattedTime = format(startTimeObj, 'HH:mm');

  return (
    <div
      onClick={(e) => onClick(event, e)}
      className="group relative flex items-center gap-1.5 px-2 py-1 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 hover:border-indigo-400/60 rounded-xs cursor-pointer transition-all duration-150 select-none overflow-hidden"
      title={`${event.title} (${formattedTime})`}
    >
      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
      <span className="text-[11px] font-mono font-medium text-indigo-300 shrink-0">
        {formattedTime}
      </span>
      <span className="text-xs font-medium text-zinc-200 truncate group-hover:text-white">
        {event.title}
      </span>
    </div>
  );
};
