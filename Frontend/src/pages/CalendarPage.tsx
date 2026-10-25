import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { type DateClickArg, type EventResizeDoneArg } from '@fullcalendar/interaction';
import type {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
} from '@fullcalendar/core';
import { addHours, setHours, setMinutes } from 'date-fns';
import { Lock, Plus, Repeat, Waves } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { ErrorState } from '../components/ui/States';
import {
  CategoryFilter,
  UNCATEGORIZED_FILTER_ID,
} from '../components/calendar/CategoryFilter';
import {
  EventFormModal,
  type EventSlotRange,
} from '../components/calendar/EventFormModal';
import { EventDetailModal } from '../components/calendar/EventDetailModal';
import { RecurrenceScopeModal } from '../components/calendar/RecurrenceScopeModal';
import { useCategories } from '../hooks/useCategories';
import {
  useEventsInRange,
  useUpdateEvent,
  useUpdateEventWithScope,
} from '../hooks/useEvents';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/errors';
import { fromApiDateTime, toApiDateTime } from '../utils/date';
import { DEFAULT_EVENT_COLOR, normalizeHexColor, withAlpha } from '../utils/colors';
import type { DateRangeParams } from '../types/api';
import type {
  EventRequestDTO,
  EventResponseDTO,
  EventScopeRequestDTO,
} from '../types/event';

interface PendingRescheduleState {
  event: EventResponseDTO;
  updateData: EventRequestDTO;
  revert: () => void;
}

/**
 * Custom event card inside FullCalendar.
 * - In Week/Day (`timeGrid*`) views, fills 100% of the vertical block from start
 *   hour to end hour (`h-full flex-col`) so a 09:00–14:00 event spans continuously.
 * - In Month (`dayGridMonth`) view, renders a compact single-row pill.
 */
function renderPersonalEventContent(arg: EventContentArg) {
  const dto = arg.event.extendedProps.dto as EventResponseDTO | undefined;
  const color = (arg.event.extendedProps.primaryColor as string | undefined) ?? DEFAULT_EVENT_COLOR;
  const isFlexible = dto?.isFlexible ?? false;
  const isPrivate = dto?.isPrivate ?? false;
  const isRecurring = Boolean(dto?.recurrenceType && dto.recurrenceType !== 'NONE');
  const eventKey = String(dto?.occurrenceId || dto?.eventId || arg.event.id);
  const isTimeGrid = arg.view.type.startsWith('timeGrid');

  if (isTimeGrid) {
    return (
      <div
        key={eventKey}
        className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[5px] px-2 py-1 text-xs leading-snug text-zinc-50"
        style={{
          backgroundColor: withAlpha(color, 0.34),
          borderLeft: `4px ${isFlexible ? 'dashed' : 'solid'} ${color}`,
          borderTop: isFlexible ? `1px dashed ${withAlpha(color, 0.85)}` : `1px solid ${withAlpha(color, 0.45)}`,
          borderRight: isFlexible ? `1px dashed ${withAlpha(color, 0.85)}` : `1px solid ${withAlpha(color, 0.45)}`,
          borderBottom: isFlexible ? `1px dashed ${withAlpha(color, 0.85)}` : `1px solid ${withAlpha(color, 0.45)}`,
        }}
      >
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-1">
            {arg.timeText && (
              <span className="truncate font-mono text-[11px] font-semibold text-zinc-100/95">
                {arg.timeText}
              </span>
            )}
            <span className="flex shrink-0 items-center gap-1">
              {isRecurring && (
                <span title="Recurring series" className="inline-flex">
                  <Repeat
                    className="h-3 w-3 text-indigo-200"
                    aria-label="Recurring series"
                  />
                </span>
              )}
              {isFlexible && (
                <span title="Flexible time" className="inline-flex">
                  <Waves
                    className="h-3 w-3 text-amber-300"
                    aria-label="Flexible time"
                  />
                </span>
              )}
              {isPrivate && (
                <span title="Private event" className="inline-flex">
                  <Lock
                    className="h-3 w-3 text-zinc-100"
                    aria-label="Private event"
                  />
                </span>
              )}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 font-semibold text-white">{arg.event.title}</p>
          {dto?.description && (
            <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-200/80">
              {dto.description}
            </p>
          )}
        </div>

        {dto && dto.categories.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1 overflow-hidden">
            {dto.categories.map((cat) => (
              <span
                key={cat.categoryId}
                className="truncate rounded-xs bg-black/30 px-1.5 py-0.5 text-[10px] font-medium text-zinc-100"
              >
                {cat.name}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      key={eventKey}
      className="flex w-full items-center gap-1.5 overflow-hidden rounded-xs px-1.5 py-0.5 text-xs leading-tight text-zinc-50"
      style={{
        backgroundColor: withAlpha(color, 0.28),
        borderLeft: `3px ${isFlexible ? 'dashed' : 'solid'} ${color}`,
        borderTop: isFlexible ? `1px dashed ${withAlpha(color, 0.7)}` : undefined,
        borderRight: isFlexible ? `1px dashed ${withAlpha(color, 0.7)}` : undefined,
        borderBottom: isFlexible ? `1px dashed ${withAlpha(color, 0.7)}` : undefined,
      }}
    >
      {arg.timeText && (
        <span className="shrink-0 font-mono text-[10px] font-medium text-zinc-200/90">
          {arg.timeText}
        </span>
      )}
      <span className="truncate font-medium">{arg.event.title}</span>
      <span className="ml-auto flex shrink-0 items-center gap-1">
        {isRecurring && (
          <span title="Recurring series" className="inline-flex">
            <Repeat
              className="h-3 w-3 text-indigo-200"
              aria-label="Recurring series"
            />
          </span>
        )}
        {isFlexible && (
          <span title="Flexible time" className="inline-flex">
            <Waves
              className="h-3 w-3 text-amber-300"
              aria-label="Flexible time"
            />
          </span>
        )}
        {isPrivate && (
          <span title="Private event" className="inline-flex">
            <Lock
              className="h-3 w-3 text-zinc-200"
              aria-label="Private event"
            />
          </span>
        )}
      </span>
    </div>
  );
}

export function CalendarPage() {
  const toast = useToast();
  const [visibleRange, setVisibleRange] = useState<DateRangeParams | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  // Modal state: creating/editing vs viewing details vs confirming recurring drag/resize
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventResponseDTO | null>(null);
  const [initialSlot, setInitialSlot] = useState<EventSlotRange | null>(null);
  const [viewingEvent, setViewingEvent] = useState<EventResponseDTO | null>(null);
  const [pendingReschedule, setPendingReschedule] = useState<PendingRescheduleState | null>(null);
  const [rescheduleScopeError, setRescheduleScopeError] = useState<string | null>(null);

  const { data: categories = [] } = useCategories();
  const {
    data: events = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useEventsInRange(visibleRange);

  // Used for drag-to-reschedule and resize (let MutationCache toast any server error)
  const rescheduleMutation = useUpdateEvent({ handlesErrorInline: false });
  const rescheduleScopeMutation = useUpdateEventWithScope({ handlesErrorInline: true });

  // Called by FullCalendar on mount and whenever the user navigates or switches view
  const handleDatesSet = (arg: DatesSetArg) => {
    const nextRange: DateRangeParams = {
      start: toApiDateTime(arg.start),
      end: toApiDateTime(arg.end),
    };
    setVisibleRange((prev) =>
      prev && prev.start === nextRange.start && prev.end === nextRange.end ? prev : nextRange,
    );
  };

  // Filter events by the active category chips
  const filteredEvents = useMemo(() => {
    if (selectedCategoryIds.length === 0) return events;
    return events.filter((ev) => {
      if (ev.categories.length === 0) {
        return selectedCategoryIds.includes(UNCATEGORIZED_FILTER_ID);
      }
      return ev.categories.some((cat) => selectedCategoryIds.includes(cat.categoryId));
    });
  }, [events, selectedCategoryIds]);

  // Convert backend DTOs into FullCalendar EventInput items
  const calendarEvents = useMemo<EventInput[]>(() => {
    return filteredEvents.map((ev) => {
      const primaryColor = normalizeHexColor(ev.categories[0]?.color ?? DEFAULT_EVENT_COLOR);
      return {
        id: String(ev.occurrenceId || ev.eventId),
        title: ev.title,
        start: fromApiDateTime(ev.startTime),
        end: fromApiDateTime(ev.endTime),
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        extendedProps: {
          dto: ev,
          primaryColor,
        },
      };
    });
  }, [filteredEvents]);

  const toggleCategoryFilter = (categoryId: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  };

  const openNewEventModal = (slot?: EventSlotRange) => {
    setEditingEvent(null);
    setInitialSlot(slot ?? null);
    setFormOpen(true);
  };

  // Dragging across time slots in Week/Day view (or days in Month view)
  const handleDateSelect = (arg: DateSelectArg) => {
    arg.view.calendar.unselect();
    if (arg.allDay) {
      const start = setMinutes(setHours(arg.start, 9), 0);
      const end = addHours(start, 1);
      openNewEventModal({ start, end });
    } else {
      openNewEventModal({ start: arg.start, end: arg.end });
    }
  };

  // Simple click on a day cell (especially handy on mobile touchscreens)
  const handleDateClick = (arg: DateClickArg) => {
    if (arg.allDay) {
      const start = setMinutes(setHours(arg.date, 9), 0);
      openNewEventModal({ start, end: addHours(start, 1) });
    } else {
      openNewEventModal({ start: arg.date, end: addHours(arg.date, 1) });
    }
  };

  // Clicking an existing event opens its details modal
  const handleEventClick = (arg: EventClickArg) => {
    const dto = arg.event.extendedProps.dto as EventResponseDTO | undefined;
    if (dto) setViewingEvent(dto);
  };

  // Drag-to-reschedule or resize-to-change-duration:
  // - Non-recurring events: sends PUT immediately with the FULL event body
  // - Recurring events: opens RecurrenceScopeModal so the user can choose which occurrences to update
  const handleEventMoveOrResize = async (arg: EventDropArg | EventResizeDoneArg) => {
    const dto = arg.event.extendedProps.dto as EventResponseDTO | undefined;
    const newStart = arg.event.start;
    const newEnd = arg.event.end;

    if (!dto || !newStart || !newEnd || newEnd.getTime() <= newStart.getTime()) {
      arg.revert();
      return;
    }

    const isRecurring = Boolean(dto.recurrenceType && dto.recurrenceType !== 'NONE');
    const updatedBody: EventRequestDTO = {
      title: dto.title,
      ...(dto.description ? { description: dto.description } : {}),
      startTime: toApiDateTime(newStart),
      endTime: toApiDateTime(newEnd),
      isFlexible: dto.isFlexible,
      categoryIds: dto.categories.map((c) => c.categoryId),
      isPrivate: dto.isPrivate,
      ...(isRecurring
        ? {
            recurrenceType: dto.recurrenceType,
            recurrenceEndDate: dto.recurrenceEndDate ?? null,
          }
        : {}),
    };

    if (isRecurring) {
      setRescheduleScopeError(null);
      setPendingReschedule({
        event: dto,
        updateData: updatedBody,
        revert: () => arg.revert(),
      });
      return;
    }

    try {
      await rescheduleMutation.mutateAsync({
        eventId: dto.eventId,
        body: updatedBody,
      });
      toast.success(`Rescheduled "${dto.title}"`);
    } catch {
      // Roll the event visually back to its original slot if the server rejects it
      arg.revert();
    }
  };

  const handleConfirmRescheduleWithScope = async (scopePayload: EventScopeRequestDTO) => {
    if (!pendingReschedule) return;
    setRescheduleScopeError(null);

    try {
      await rescheduleScopeMutation.mutateAsync({
        eventId: pendingReschedule.event.eventId,
        body: scopePayload,
      });
      toast.success(`Rescheduled "${pendingReschedule.event.title}"`);
      setPendingReschedule(null);
    } catch (err) {
      setRescheduleScopeError(getErrorMessage(err));
    }
  };

  const handleCancelRescheduleWithScope = () => {
    if (pendingReschedule) {
      pendingReschedule.revert();
    }
    setPendingReschedule(null);
    setRescheduleScopeError(null);
  };

  return (
    <div>
      <PageHeader
        title="My calendar"
        description="Click any slot to schedule an event, or drag an event to reschedule it."
        actions={
          <div className="flex items-center gap-3">
            {isFetching && (
              <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                <Spinner size="sm" label="Syncing calendar" />
                <span className="hidden sm:inline">Syncing…</span>
              </span>
            )}
            <Button
              onClick={() => openNewEventModal()}
              leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            >
              New event
            </Button>
          </div>
        }
      />

      <CategoryFilter
        categories={categories}
        selectedCategoryIds={selectedCategoryIds}
        onToggleCategory={toggleCategoryFilter}
        onClearFilter={() => setSelectedCategoryIds([])}
      />

      {isError && events.length === 0 ? (
        <ErrorState
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : (
        <div className="relative rounded-2xl border border-dark-border bg-dark-surface p-3 shadow-xl sm:p-5">
          {isLoading && visibleRange && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-dark-bg/50 backdrop-blur-[1px]">
              <Spinner size="lg" label="Loading calendar events" />
            </div>
          )}

          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            buttonText={{
              today: 'Today',
              month: 'Month',
              week: 'Week',
              day: 'Day',
            }}
            firstDay={1}
            height="auto"
            allDaySlot={false}
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            slotDuration="00:30:00"
            slotLabelInterval="01:00:00"
            expandRows={true}
            nowIndicator={true}
            selectable={true}
            selectMirror={true}
            editable={true}
            eventDurationEditable={true}
            eventResizableFromStart={true}
            dayMaxEvents={3}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            datesSet={handleDatesSet}
            events={calendarEvents}
            select={handleDateSelect}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventDrop={(arg) => void handleEventMoveOrResize(arg)}
            eventResize={(arg) => void handleEventMoveOrResize(arg)}
            eventContent={renderPersonalEventContent}
          />
        </div>
      )}

      {/* View event details modal */}
      <EventDetailModal
        event={viewingEvent}
        onClose={() => setViewingEvent(null)}
        onEdit={(ev) => {
          setViewingEvent(null);
          setEditingEvent(ev);
          setInitialSlot(null);
          setFormOpen(true);
        }}
      />

      {/* Create / Edit event modal */}
      <EventFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        event={editingEvent}
        initialSlot={initialSlot}
        categories={categories}
      />

      {/* Scoped confirmation dialog when a recurring event is dragged/resized on the calendar */}
      <RecurrenceScopeModal
        isOpen={pendingReschedule !== null}
        onClose={handleCancelRescheduleWithScope}
        mode="edit"
        event={pendingReschedule?.event ?? null}
        updateData={pendingReschedule?.updateData ?? null}
        onConfirm={handleConfirmRescheduleWithScope}
        isLoading={rescheduleScopeMutation.isPending}
        errorMessage={rescheduleScopeError}
      />
    </div>
  );
}
