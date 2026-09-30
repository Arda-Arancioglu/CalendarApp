import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/layout/Header';
import { CalendarHeader, type CalendarViewMode } from '../components/calendar/CalendarHeader';
import { MonthView } from '../components/calendar/MonthView';
import { WeekView } from '../components/calendar/WeekView';
import { CreateEventModal } from '../components/calendar/CreateEventModal';
import { EventDetailModal } from '../components/calendar/EventDetailModal';
import type { CalendarEvent, CreateEventPayload } from '../types/event';
import { eventService } from '../services/eventService';
import { addMonths, subMonths, addWeeks, subWeeks, startOfToday } from 'date-fns';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(startOfToday());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createInitialDate, setCreateInitialDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Fetch events from backend API
  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    setApiError(null);
    try {
      const data = await eventService.getEvents();
      setEvents(data);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Unable to connect to Spring Boot server at http://localhost:8080/api.';
      setApiError(msg);
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Date Navigation Handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate((prev) => subMonths(prev, 1));
    } else {
      setCurrentDate((prev) => subWeeks(prev, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate((prev) => addMonths(prev, 1));
    } else {
      setCurrentDate((prev) => addWeeks(prev, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(startOfToday());
  };

  // Cell Click -> Open Create Modal with clicked date
  const handleSelectCellDate = (date: Date) => {
    setCreateInitialDate(date);
    setIsCreateModalOpen(true);
  };

  // Create Event Handler
  const handleCreateEvent = async (payload: CreateEventPayload) => {
    const newEvt = await eventService.createEvent(payload);
    setEvents((prev) => [...prev, newEvt]);
  };

  // Delete Event Handler
  const handleDeleteEvent = async (eventId: number) => {
    await eventService.deleteEvent(eventId);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-zinc-100 flex flex-col font-sans">
      {/* Persistent Slim Header */}
      <Header />

      {/* Main Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* API Error / Offline Diagnostic Banner */}
        {apiError && (
          <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-300">Spring Boot API Connection Alert</p>
                <p className="text-amber-300/80 text-[11px] mt-0.5">{apiError}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button variant="outline" size="sm" onClick={fetchEvents} isLoading={isLoadingEvents}>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </Button>
            </div>
          </div>
        )}

        {/* Calendar Header Controls */}
        <CalendarHeader
          currentDate={currentDate}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNavigatePrev={handlePrev}
          onNavigateNext={handleNext}
          onNavigateToday={handleToday}
          onNewEventClick={() => {
            setCreateInitialDate(null);
            setIsCreateModalOpen(true);
          }}
        />

        {/* Loading Indicator */}
        {isLoadingEvents ? (
          <div className="h-[480px] bg-[#11131F] border border-[#272A3D] rounded-md flex flex-col items-center justify-center gap-3 text-zinc-400">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono tracking-wider uppercase">Loading events from API...</span>
          </div>
        ) : (
          /* Calendar Views */
          <div>
            {viewMode === 'month' ? (
              <MonthView
                currentDate={currentDate}
                events={events}
                onSelectEvent={setSelectedEvent}
                onSelectCellDate={handleSelectCellDate}
              />
            ) : (
              <WeekView
                currentDate={currentDate}
                events={events}
                onSelectEvent={setSelectedEvent}
                onSelectCellDate={handleSelectCellDate}
              />
            )}
          </div>
        )}
      </main>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateEvent}
        initialDate={createInitialDate}
      />

      {/* Event Detail Inspection Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
};
