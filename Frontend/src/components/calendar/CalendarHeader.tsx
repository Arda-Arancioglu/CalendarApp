import React from 'react';
import { ChevronLeft, ChevronRight, Plus, Grid, Columns } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../ui/Button';

export type CalendarViewMode = 'month' | 'week';

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onNavigateToday: () => void;
  onNewEventClick: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  viewMode,
  onViewModeChange,
  onNavigatePrev,
  onNavigateNext,
  onNavigateToday,
  onNewEventClick,
}) => {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-4 border-b border-[#272A3D]">
      {/* Date Title & Prev/Next/Today Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-[#11131F] border border-[#272A3D] rounded-sm p-1">
          <button
            onClick={onNavigatePrev}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-[#1A1D2D] rounded-xs transition-colors"
            title="Previous period"
            aria-label="Previous period"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNavigateToday}
            className="px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:text-zinc-100 hover:bg-[#1A1D2D] rounded-xs transition-colors"
          >
            Today
          </button>
          <button
            onClick={onNavigateNext}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-[#1A1D2D] rounded-xs transition-colors"
            title="Next period"
            aria-label="Next period"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <h2 className="text-lg md:text-xl font-bold text-zinc-100 tracking-tight">
          {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : "'Week of' MMM d, yyyy")}
        </h2>
      </div>

      {/* View Switcher & Action Buttons */}
      <div className="flex items-center gap-3">
        {/* View Switcher Toggle */}
        <div className="flex items-center bg-[#090A0F] border border-[#272A3D] p-1 rounded-sm">
          <button
            onClick={() => onViewModeChange('month')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xs transition-colors ${
              viewMode === 'month'
                ? 'bg-[#1A1D2D] text-indigo-300 border border-indigo-500/40 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Month</span>
          </button>
          <button
            onClick={() => onViewModeChange('week')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xs transition-colors ${
              viewMode === 'week'
                ? 'bg-[#1A1D2D] text-indigo-300 border border-indigo-500/40 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Week</span>
          </button>
        </div>

        {/* New Event Action Button */}
        <Button variant="primary" size="md" onClick={onNewEventClick}>
          <Plus className="w-4 h-4" />
          <span>New Event</span>
        </Button>
      </div>
    </div>
  );
};
