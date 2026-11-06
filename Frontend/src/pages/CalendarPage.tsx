import { useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, {
  type DateClickArg,
  type EventDragStartArg,
  type EventDragStopArg,
  type EventResizeDoneArg,
} from '@fullcalendar/interaction';
import type {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
} from '@fullcalendar/core';
import { addDays, addHours, differenceInCalendarDays, format, setHours, setMinutes } from 'date-fns';
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns3,
  Dumbbell,
  LayoutGrid,
  LayoutList,
  Lock,
  Pencil,
  Plus,
  Repeat,
  RotateCcw,
  Waves,
  type LucideIcon,
} from 'lucide-react';
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
import { RoutineDetailModal } from '../components/calendar/RoutineDetailModal';
import { RoutineFormModal } from '../components/calendar/RoutineFormModal';
import { CompactScheduleView } from '../components/calendar/CompactScheduleViews';
import type { ScheduleLayoutMode } from '../utils/scheduleCompression';
import {
  ExportCalendarModal,
  type CalendarExportOptions,
} from '../components/calendar/ExportCalendarModal';
import { useCategories } from '../hooks/useCategories';
import {
  useEventsInRange,
  useUpdateEvent,
  useUpdateEventWithScope,
} from '../hooks/useEvents';
import { useRoutineOccurrences, useRoutines } from '../hooks/useRoutines';
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
import type { RoutineOccurrenceDTO, RoutineResponseDTO } from '../types/routine';

const NEUTRAL_EXPORT_COLOR = '#64748B';
const EDGE_HOLD_REPEAT_MS = 550;
const EDGE_FLICK_COOLDOWN_MS = 320;
const EDGE_ZONE_PX = 56;

const START_HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, '0')}:00`,
);
const END_HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) =>
  `${String(i + 1).padStart(2, '0')}:00`,
);

const SCHEDULE_LAYOUT_OPTIONS: {
  id: ScheduleLayoutMode;
  label: string;
  title: string;
  icon: LucideIcon;
}[] = [
  {
    id: 'standard',
    label: 'Standard View',
    title: 'Proportional time grid',
    icon: LayoutGrid,
  },
  {
    id: 'cards',
    label: 'Task View',
    title: 'Equal-height task cards per day with compact free-time dividers',
    icon: LayoutList,
  },
  {
    id: 'compressed',
    label: 'Compressed View',
    title: 'Compressed time grid that only keeps the time cuts that matter',
    icon: Columns3,
  },
];

interface PendingRescheduleState {
  event: EventResponseDTO;
  updateData: EventRequestDTO;
  revert: () => void;
}

interface StagedEventChange {
  key: string;
  event: EventResponseDTO;
  originalBody: EventRequestDTO;
  updatedBody: EventRequestDTO;
  updatedStart: string;
  updatedEnd: string;
  isRecurring: boolean;
  occurrenceDate: string;
}

function buildEventRequestBody(
  dto: EventResponseDTO,
  startTime: string,
  endTime: string,
): EventRequestDTO {
  const isRecurring = Boolean(dto.recurrenceType && dto.recurrenceType !== 'NONE');
  return {
    title: dto.title,
    ...(dto.emoji ? { emoji: dto.emoji } : {}),
    ...(dto.description ? { description: dto.description } : {}),
    startTime,
    endTime,
    isFlexible: dto.isFlexible,
    categoryIds: dto.categories.map((c) => c.categoryId),
    isPrivate: dto.isPrivate,
    ...(isRecurring
      ? {
          recurrenceType: dto.recurrenceType,
          recurrenceEndDate: dto.recurrenceEndDate ?? null,
          ...(dto.recurrenceInterval ? { recurrenceInterval: dto.recurrenceInterval } : {}),
          ...(dto.recurrenceDays ? { recurrenceDays: dto.recurrenceDays } : {}),
        }
      : {}),
  };
}

function parseRoutineOccurrenceRange(occ: RoutineOccurrenceDTO): { start: Date; end: Date } {
  const normalizeTime = (t: string | null, fallback: string): string => {
    if (!t) return fallback;
    return /^\d{2}:\d{2}$/.test(t) ? `${t}:00` : t;
  };
  const startStr = `${occ.startDate}T${normalizeTime(occ.startTime, '09:00:00')}`;
  const endStr = `${occ.startDate}T${normalizeTime(occ.endTime, '10:00:00')}`;
  const start = fromApiDateTime(startStr);
  const end = fromApiDateTime(endStr);
  if (end.getTime() <= start.getTime()) {
    return { start, end: addHours(start, 1) };
  }
  return { start, end };
}

/**
 * Custom event card inside FullCalendar supporting both Personal Events and Cycle Routine Occurrences.
 */
function renderPersonalEventContent(arg: EventContentArg) {
  const kind = (arg.event.extendedProps.kind as 'event' | 'routine' | undefined) ?? 'event';
  const color = (arg.event.extendedProps.primaryColor as string | undefined) ?? DEFAULT_EVENT_COLOR;
  const isTimeGrid = arg.view.type.startsWith('timeGrid');

  if (kind === 'routine') {
    const occ = arg.event.extendedProps.routineOccurrence as RoutineOccurrenceDTO;
    const routine = arg.event.extendedProps.routine as RoutineResponseDTO | undefined;
    const dayLabel = routine?.cycleLength
      ? `Day ${occ.dayIndex + 1} of ${routine.cycleLength}`
      : `Day ${occ.dayIndex + 1}`;
    const routineKey = `routine_${occ.routineId}_${occ.routineItemId}_${occ.startDate}`;

    if (isTimeGrid) {
      return (
        <div
          key={routineKey}
          className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[5px] px-2 py-1 text-xs leading-snug text-zinc-50"
          style={{
            backgroundColor: withAlpha(color, 0.30),
            borderLeft: `4px solid ${color}`,
            borderTop: `1px solid ${withAlpha(color, 0.65)}`,
            borderRight: `1px solid ${withAlpha(color, 0.65)}`,
            borderBottom: `1px solid ${withAlpha(color, 0.65)}`,
          }}
        >
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-1">
              {arg.timeText && (
                <span className="truncate font-mono text-[11px] font-semibold text-zinc-100/95">
                  {arg.timeText}
                </span>
              )}
              <span
                title={`Routine (${dayLabel})`}
                className="inline-flex shrink-0 items-center gap-1 rounded-xs bg-black/35 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-100"
              >
                <Dumbbell className="h-2.5 w-2.5 text-indigo-200" aria-hidden="true" />
                <span>{dayLabel}</span>
              </span>
            </div>
            <p className="mt-0.5 line-clamp-2 font-semibold text-white">{arg.event.title}</p>
            {occ.description && (
              <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-200/80">
                {occ.description}
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        key={routineKey}
        className="flex w-full items-center gap-1.5 overflow-hidden rounded-xs px-1.5 py-0.5 text-xs leading-tight text-zinc-50"
        style={{
          backgroundColor: withAlpha(color, 0.28),
          borderLeft: `3px solid ${color}`,
          borderTop: `1px solid ${withAlpha(color, 0.55)}`,
          borderRight: `1px solid ${withAlpha(color, 0.55)}`,
          borderBottom: `1px solid ${withAlpha(color, 0.55)}`,
        }}
      >
        <Dumbbell className="h-3 w-3 shrink-0 text-indigo-200" aria-label="Routine" />
        <span className="truncate font-medium">{arg.event.title}</span>
        <span className="ml-auto shrink-0 rounded-xs bg-black/35 px-1 py-0.5 font-mono text-[9px] font-semibold text-indigo-100">
          {dayLabel}
        </span>
      </div>
    );
  }

  const dto = arg.event.extendedProps.dto as EventResponseDTO | undefined;
  const isStaged = Boolean(arg.event.extendedProps.isStaged);
  const isMaskedPrivate = Boolean(arg.event.extendedProps.isMaskedPrivate);
  const isFlexible = dto?.isFlexible ?? false;
  const isPrivate = dto?.isPrivate ?? false;
  const isRecurring = Boolean(dto?.recurrenceType && dto.recurrenceType !== 'NONE');
  const eventKey = String(dto?.occurrenceId || dto?.eventId || arg.event.id);

  if (isTimeGrid) {
    return (
      <div
        key={eventKey}
        className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[5px] px-2 py-1 text-xs leading-snug text-zinc-50"
        style={{
          backgroundColor: withAlpha(color, 0.34),
          borderLeft: `4px ${isFlexible ? 'dashed' : 'solid'} ${color}`,
          borderTop: isFlexible
            ? `1px dashed ${withAlpha(color, 0.85)}`
            : `1px solid ${withAlpha(color, 0.45)}`,
          borderRight: isFlexible
            ? `1px dashed ${withAlpha(color, 0.85)}`
            : `1px solid ${withAlpha(color, 0.45)}`,
          borderBottom: isFlexible
            ? `1px dashed ${withAlpha(color, 0.85)}`
            : `1px solid ${withAlpha(color, 0.45)}`,
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
              {isStaged && (
                <span className="rounded-xs bg-amber-500/30 px-1 py-0.5 font-mono text-[9px] font-bold uppercase text-amber-200">
                  Staged
                </span>
              )}
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
          <p className="mt-0.5 line-clamp-2 font-semibold text-white">
            {!isMaskedPrivate && dto?.emoji?.trim() && (
              <span className="mr-1.5 inline-block select-none text-[13px] sm:text-[14px]">
                {dto.emoji}
              </span>
            )}
            {arg.event.title}
          </p>
          {!isMaskedPrivate && dto?.description && (
            <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-200/80">
              {dto.description}
            </p>
          )}
        </div>

        {!isMaskedPrivate && dto && dto.categories.length > 0 && (
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
      <span className="truncate font-medium">
        {!isMaskedPrivate && dto?.emoji?.trim() && (
          <span className="mr-1 inline-block select-none text-[11px] sm:text-xs">
            {dto.emoji}
          </span>
        )}
        {arg.event.title}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-1">
        {isStaged && (
          <span className="rounded-xs bg-amber-500/30 px-1 font-mono text-[9px] font-bold text-amber-200">
            •
          </span>
        )}
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
  const calendarRef = useRef<FullCalendar | null>(null);
  const calendarContainerRef = useRef<HTMLDivElement | null>(null);

  const [visibleRange, setVisibleRange] = useState<DateRangeParams | null>(null);
  const [activeViewType, setActiveViewType] = useState<string>('dayGridMonth');
  const [viewTitle, setViewTitle] = useState<string>('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  // User-customizable 24-hour visible range & schedule layout mode
  const [visibleStartTime, setVisibleStartTime] = useState<string>('00:00');
  const [visibleEndTime, setVisibleEndTime] = useState<string>('24:00');
  const [scheduleLayout, setScheduleLayout] = useState<ScheduleLayoutMode>('standard');

  // Modal state: creating/editing/duplicating events & routines, routines manager, export modal
  const [formOpen, setFormOpen] = useState(false);
  const [routineFormOpen, setRoutineFormOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [activeExportOptions, setActiveExportOptions] = useState<CalendarExportOptions | null>(
    null,
  );

  const [editingEvent, setEditingEvent] = useState<EventResponseDTO | null>(null);
  const [duplicatingEvent, setDuplicatingEvent] = useState<EventResponseDTO | null>(null);
  const [initialSlot, setInitialSlot] = useState<EventSlotRange | null>(null);
  const [viewingEvent, setViewingEvent] = useState<EventResponseDTO | null>(null);
  const [viewingRoutineOccurrence, setViewingRoutineOccurrence] =
    useState<RoutineOccurrenceDTO | null>(null);

  const [pendingReschedule, setPendingReschedule] = useState<PendingRescheduleState | null>(null);
  const [rescheduleScopeError, setRescheduleScopeError] = useState<string | null>(null);

  // Edit Mode (Batch Staging) state
  const [isEditMode, setIsEditMode] = useState(false);
  const [stagedChanges, setStagedChanges] = useState<Record<string, StagedEventChange>>({});
  const [isSavingStaged, setIsSavingStaged] = useState(false);

  // Multi-Week Edge Dragging state
  const [isDraggingEvent, setIsDraggingEvent] = useState(false);
  const [activeEdgeZone, setActiveEdgeZone] = useState<'prev' | 'next' | null>(null);
  const [fallbackToday] = useState(() => new Date());

  const { data: categories = [] } = useCategories();
  const {
    data: events = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useEventsInRange(visibleRange);

  const routineFromDate = visibleRange ? visibleRange.start.slice(0, 10) : null;
  const routineEndDate = visibleRange ? visibleRange.end.slice(0, 10) : null;
  const { data: routineOccurrences = [] } = useRoutineOccurrences(routineFromDate, routineEndDate);
  const { data: routines = [] } = useRoutines();

  const routinesById = useMemo(() => {
    const map = new Map<number, RoutineResponseDTO>();
    for (const r of routines) {
      map.set(r.routineId, r);
    }
    return map;
  }, [routines]);

  const rescheduleMutation = useUpdateEvent({ handlesErrorInline: false });
  const rescheduleScopeMutation = useUpdateEventWithScope({ handlesErrorInline: true });

  // Reliable window-level pointermove / mousemove Multi-Week Edge Dragging
  useEffect(() => {
    if (!isDraggingEvent) {
      return;
    }

    let currentZone: 'prev' | 'next' | null = null;
    let lastFlipTime = 0;
    let holdInterval: number | null = null;

    const clearHoldInterval = () => {
      if (holdInterval !== null) {
        window.clearInterval(holdInterval);
        holdInterval = null;
      }
    };

    const triggerCalendarFlip = (dir: 'prev' | 'next') => {
      const now = Date.now();
      if (now - lastFlipTime < EDGE_FLICK_COOLDOWN_MS) return;
      lastFlipTime = now;
      const api = calendarRef.current?.getApi();
      if (!api) return;
      if (dir === 'prev') {
        api.prev();
      } else {
        api.next();
      }
    };

    const handlePointerMove = (e: MouseEvent | PointerEvent) => {
      const container = calendarContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      let nextZone: 'prev' | 'next' | null = null;
      if (e.clientX <= rect.left + EDGE_ZONE_PX) {
        nextZone = 'prev';
      } else if (e.clientX >= rect.right - EDGE_ZONE_PX) {
        nextZone = 'next';
      }

      if (nextZone !== currentZone) {
        currentZone = nextZone;
        setActiveEdgeZone(nextZone);
        clearHoldInterval();

        if (nextZone !== null) {
          // Flip immediately when flicking into the edge zone, then repeat if held
          triggerCalendarFlip(nextZone);
          holdInterval = window.setInterval(() => {
            if (currentZone) {
              triggerCalendarFlip(currentZone);
            }
          }, EDGE_HOLD_REPEAT_MS);
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('mousemove', handlePointerMove, { passive: true });

    return () => {
      clearHoldInterval();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mousemove', handlePointerMove);
    };
  }, [isDraggingEvent]);

  const handleDatesSet = (arg: DatesSetArg) => {
    const nextRange: DateRangeParams = {
      start: toApiDateTime(arg.start),
      end: toApiDateTime(arg.end),
    };
    setActiveViewType(arg.view.type);
    setViewTitle(arg.view.title);
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

  // Convert backend DTOs + RoutineOccurrences into FullCalendar EventInput items
  const calendarEvents = useMemo<EventInput[]>(() => {
    const maskPrivate = activeExportOptions?.maskPrivateEvents ?? false;
    const preserveColors = activeExportOptions?.preserveCategoryColors ?? true;

    const personalInputs: EventInput[] = filteredEvents.map((ev) => {
      const key = String(ev.occurrenceId || ev.eventId);
      const staged = stagedChanges[key];
      const rawColor = normalizeHexColor(ev.categories[0]?.color ?? DEFAULT_EVENT_COLOR);
      const primaryColor = preserveColors ? rawColor : NEUTRAL_EXPORT_COLOR;
      const isMaskedPrivate = maskPrivate && ev.isPrivate;

      const effectiveStart = staged ? staged.updatedStart : ev.startTime;
      const effectiveEnd = staged ? staged.updatedEnd : ev.endTime;

      return {
        id: key,
        title: isMaskedPrivate ? 'BUSY' : ev.title,
        start: fromApiDateTime(effectiveStart),
        end: fromApiDateTime(effectiveEnd),
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        extendedProps: {
          kind: 'event',
          dto: ev,
          primaryColor,
          isStaged: Boolean(staged),
          isMaskedPrivate,
        },
      };
    });

    const routineInputs: EventInput[] = routineOccurrences
      .filter((occ) => !occ.isRestDay)
      .map((occ) => {
        const routine = routinesById.get(occ.routineId);
        const rawColor = normalizeHexColor(occ.color ?? routine?.color ?? DEFAULT_EVENT_COLOR);
        const primaryColor = preserveColors ? rawColor : NEUTRAL_EXPORT_COLOR;
        const { start, end } = parseRoutineOccurrenceRange(occ);

        return {
          id: `routine_${occ.routineId}_${occ.routineItemId}_${occ.startDate}`,
          title: occ.title,
          start,
          end,
          editable: false,
          durationEditable: false,
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          extendedProps: {
            kind: 'routine',
            routineOccurrence: occ,
            routine,
            primaryColor,
          },
        };
      });

    return [...personalInputs, ...routineInputs];
  }, [
    filteredEvents,
    routineOccurrences,
    routinesById,
    stagedChanges,
    activeExportOptions,
  ]);

  // Visible days array for Compact Variety 1 & Compact Variety 2
  const visibleDays = useMemo<Date[]>(() => {
    if (!visibleRange) return [fallbackToday];
    const start = fromApiDateTime(visibleRange.start);
    const end = fromApiDateTime(visibleRange.end);
    const count = Math.max(1, Math.min(14, differenceInCalendarDays(end, start)));
    return Array.from({ length: count }, (_, idx) => addDays(start, idx));
  }, [visibleRange, fallbackToday]);

  const toggleCategoryFilter = (categoryId: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  };

  const openNewEventModal = (slot?: EventSlotRange) => {
    setEditingEvent(null);
    setDuplicatingEvent(null);
    setInitialSlot(slot ?? null);
    setFormOpen(true);
  };

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

  const handleDateClick = (arg: DateClickArg) => {
    if (arg.allDay) {
      const start = setMinutes(setHours(arg.date, 9), 0);
      openNewEventModal({ start, end: addHours(start, 1) });
    } else {
      openNewEventModal({ start: arg.date, end: addHours(arg.date, 1) });
    }
  };

  const handleEventClick = (arg: EventClickArg) => {
    const kind = arg.event.extendedProps.kind as 'event' | 'routine' | undefined;
    if (kind === 'routine') {
      const occ = arg.event.extendedProps.routineOccurrence as RoutineOccurrenceDTO | undefined;
      if (occ) setViewingRoutineOccurrence(occ);
      return;
    }
    const dto = arg.event.extendedProps.dto as EventResponseDTO | undefined;
    if (dto) setViewingEvent(dto);
  };

  const handleEventDragStart = (_arg: EventDragStartArg) => {
    setIsDraggingEvent(true);
  };

  const handleEventDragStop = (_arg: EventDragStopArg) => {
    setIsDraggingEvent(false);
    setActiveEdgeZone(null);
  };

  const handleEventMoveOrResize = async (arg: EventDropArg | EventResizeDoneArg) => {
    const dto = arg.event.extendedProps.dto as EventResponseDTO | undefined;
    const newStart = arg.event.start;
    const newEnd = arg.event.end;

    if (!dto || !newStart || !newEnd || newEnd.getTime() <= newStart.getTime()) {
      arg.revert();
      return;
    }

    const key = String(dto.occurrenceId || dto.eventId);
    const updatedStart = toApiDateTime(newStart);
    const updatedEnd = toApiDateTime(newEnd);
    const isRecurring = Boolean(dto.recurrenceType && dto.recurrenceType !== 'NONE');
    const originalBody = buildEventRequestBody(dto, dto.startTime, dto.endTime);
    const updatedBody = buildEventRequestBody(dto, updatedStart, updatedEnd);

    if (isEditMode) {
      setStagedChanges((prev) => ({
        ...prev,
        [key]: {
          key,
          event: dto,
          originalBody,
          updatedBody,
          updatedStart,
          updatedEnd,
          isRecurring,
          occurrenceDate: dto.startTime.slice(0, 10),
        },
      }));
      return;
    }

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
      toast.success(`Rescheduled "${dto.title}"`, {
        durationMs: 6000,
        action: {
          label: 'Undo',
          onClick: () => {
            void rescheduleMutation
              .mutateAsync({
                eventId: dto.eventId,
                body: originalBody,
              })
              .then(() => {
                toast.info(`Restored "${dto.title}" to original time`);
              });
          },
        },
      });
    } catch {
      arg.revert();
    }
  };

  const stagedList = Object.values(stagedChanges);

  const handleDiscardStagedChanges = () => {
    setStagedChanges({});
    toast.info('Discarded staged schedule changes');
  };

  const handleSaveAllStagedChanges = async () => {
    if (stagedList.length === 0) {
      setIsEditMode(false);
      return;
    }

    setIsSavingStaged(true);
    try {
      for (const item of stagedList) {
        if (item.isRecurring) {
          await rescheduleScopeMutation.mutateAsync({
            eventId: item.event.eventId,
            body: {
              scope: 'SELECTED',
              selectedDates: [item.occurrenceDate],
              updateData: item.updatedBody,
            },
          });
        } else {
          await rescheduleMutation.mutateAsync({
            eventId: item.event.eventId,
            body: item.updatedBody,
          });
        }
      }
      setStagedChanges({});
      setIsEditMode(false);
      toast.success(
        `Saved ${stagedList.length} ${stagedList.length === 1 ? 'change' : 'changes'}`,
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSavingStaged(false);
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

  const activeViewingRoutine = viewingRoutineOccurrence
    ? routinesById.get(viewingRoutineOccurrence.routineId) ?? null
    : null;

  const effectiveStartTime =
    activeExportOptions?.visibleStartTime ?? visibleStartTime;
  const effectiveEndTime =
    activeExportOptions?.visibleEndTime ?? visibleEndTime;
  const effectiveLayoutMode =
    activeExportOptions?.layoutMode ?? scheduleLayout;

  const isWeekOrDayView = activeViewType.startsWith('timeGrid');
  const showCompactView = isWeekOrDayView && effectiveLayoutMode !== 'standard';

  const switchToScheduleLayout = (mode: ScheduleLayoutMode) => {
    setScheduleLayout(mode);
    // If the user selects a Compact schedule layout while on Month view, switch to Week view automatically
    if (mode !== 'standard' && !activeViewType.startsWith('timeGrid')) {
      calendarRef.current?.getApi().changeView('timeGridWeek');
    }
  };

  return (
    <div className="pb-16">
      <PageHeader
        title="My calendar"
        description="Click any slot to schedule an event, build N-day cycle routines, or toggle Edit Schedule to batch changes."
        actions={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            {isFetching && (
              <div className="col-span-2 flex items-center justify-end gap-1.5 text-xs text-zinc-400 sm:col-auto sm:inline-flex">
                <Spinner size="sm" label="Syncing calendar" />
                <span className="hidden sm:inline">Syncing...</span>
              </div>
            )}

            <Button
              variant={isEditMode ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setIsEditMode((prev) => !prev)}
              aria-pressed={isEditMode}
              className="w-full justify-center sm:w-auto"
              leftIcon={<Pencil className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              {isEditMode ? 'Editing' : 'Edit Schedule'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setExportModalOpen(true)}
              className="w-full justify-center sm:w-auto"
              leftIcon={<Camera className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Export View
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRoutineFormOpen(true)}
              className="w-full justify-center sm:w-auto"
              leftIcon={<Dumbbell className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              New routine
            </Button>

            <Button
              size="sm"
              onClick={() => openNewEventModal()}
              className="w-full justify-center sm:w-auto"
              leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            >
              New event
            </Button>
          </div>
        }
      />

      {isEditMode && (
        <div
          role="status"
          className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-100"
        >
          <span className="font-medium">
            <Pencil className="mr-1.5 inline-block h-3.5 w-3.5 text-amber-400" aria-hidden="true" /><strong>Edit Mode Active:</strong> Drag or resize any events freely without confirmation popups. Changes are staged locally until you save.
          </span>
          <span className="font-mono text-amber-200">
            {stagedList.length} {stagedList.length === 1 ? 'change' : 'changes'} staged
          </span>
        </div>
      )}

      <CategoryFilter
        categories={categories}
        selectedCategoryIds={selectedCategoryIds}
        onToggleCategory={toggleCategoryFilter}
        onClearFilter={() => setSelectedCategoryIds([])}
      />

        {/* Schedule Layout Switcher + Custom Visible Hours Bar */}
        <div className="mb-3 flex flex-col gap-3 rounded-xl border border-dark-border bg-dark-surface/75 px-3 py-2.5 sm:px-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="grid grid-cols-3 gap-1 sm:flex sm:flex-wrap sm:items-center sm:gap-1.5"
            role="group"
            aria-label="Schedule layout mode"
          >
            <span className="mr-1 hidden text-xs font-medium text-zinc-400 sm:inline">Layout:</span>
            {SCHEDULE_LAYOUT_OPTIONS.map(({ id, label, title, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => switchToScheduleLayout(id)}
                aria-pressed={scheduleLayout === id}
                title={title}
                className={`inline-flex min-w-0 items-center justify-center gap-1 sm:gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors sm:justify-start sm:px-2.5 ${
                  scheduleLayout === id
                    ? 'bg-indigo-500/20 text-indigo-100 ring-1 ring-inset ring-indigo-400/40'
                    : 'text-zinc-400 hover:bg-dark-hover hover:text-zinc-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          {/* Custom Visible Hours Range */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:justify-start">
            <span className="inline-flex items-center gap-1 text-zinc-400">
              <Clock className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
              <span>Visible hours:</span>
            </span>

            <div className="flex items-center gap-1.5">
              <select
                aria-label="Visible start hour"
                value={visibleStartTime}
                onChange={(e) => {
                  const nextStart = e.target.value;
                  setVisibleStartTime(nextStart);
                  if (nextStart >= visibleEndTime) {
                    setVisibleEndTime('24:00');
                  }
                }}
                className="h-9 sm:h-9.5 rounded-xl border border-dark-border bg-dark-bg px-2.5 py-1 font-mono text-xs sm:px-3 sm:text-sm text-zinc-100 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                {START_HOUR_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <span className="text-zinc-500">→</span>

              <select
                aria-label="Visible end hour"
                value={visibleEndTime}
                onChange={(e) => {
                  const nextEnd = e.target.value;
                  if (nextEnd > visibleStartTime) {
                    setVisibleEndTime(nextEnd);
                  }
                }}
                className="h-9 sm:h-9.5 rounded-xl border border-dark-border bg-dark-bg px-2.5 py-1 font-mono text-xs sm:px-3 sm:text-sm text-zinc-100 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                {END_HOUR_OPTIONS.filter((t) => t > visibleStartTime).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              {(visibleStartTime !== '00:00' || visibleEndTime !== '24:00') && (
                <button
                  type="button"
                  onClick={() => {
                    setVisibleStartTime('00:00');
                    setVisibleEndTime('24:00');
                  }}
                  className="rounded-md px-1.5 py-0.5 text-[11px] text-indigo-300 hover:bg-dark-hover hover:text-indigo-200"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

      {isError && events.length === 0 ? (
        <ErrorState
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : (
        <div
          ref={calendarContainerRef}
          className="relative rounded-2xl border border-dark-border bg-dark-surface p-3 shadow-xl sm:p-5"
        >
          {isLoading && visibleRange && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-dark-bg/50 backdrop-blur-[1px]">
              <Spinner size="lg" label="Loading calendar events" />
            </div>
          )}

          {/* Visual Edge-Drag Indicators while dragging an event */}
          {isDraggingEvent && (
            <>
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-y-12 left-0 z-30 flex w-12 items-center justify-center rounded-l-xl transition-colors ${
                  activeEdgeZone === 'prev'
                    ? 'bg-indigo-500/35 text-white ring-2 ring-indigo-400'
                    : 'bg-indigo-500/15 text-indigo-200'
                }`}
              >
                <ChevronLeft className="h-5 w-5 animate-pulse" />
              </div>
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-y-12 right-0 z-30 flex w-12 items-center justify-center rounded-r-xl transition-colors ${
                  activeEdgeZone === 'next'
                    ? 'bg-indigo-500/35 text-white ring-2 ring-indigo-400'
                    : 'bg-indigo-500/15 text-indigo-200'
                }`}
              >
                <ChevronRight className="h-5 w-5 animate-pulse" />
              </div>
            </>
          )}

          {/* Synced Toolbar + Compact Schedule View when in Cards or Compressed Grid mode */}
          {showCompactView && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="inline-flex overflow-hidden rounded-lg border border-dark-border bg-dark-elevated">
                    <button
                      type="button"
                      onClick={() => calendarRef.current?.getApi().prev()}
                      aria-label="Previous period"
                      className="px-2.5 py-1.5 text-zinc-200 transition-colors hover:bg-dark-hover"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => calendarRef.current?.getApi().next()}
                      aria-label="Next period"
                      className="border-l border-dark-border px-2.5 py-1.5 text-zinc-200 transition-colors hover:bg-dark-hover"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => calendarRef.current?.getApi().today()}
                    className="rounded-lg border border-dark-border bg-dark-elevated px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-dark-hover"
                  >
                    Today
                  </button>
                </div>

                <h2 className="order-first w-full text-center text-base font-semibold tracking-tight text-zinc-50 sm:order-none sm:w-auto sm:text-lg">
                  {viewTitle}
                </h2>

                <div className="inline-flex overflow-hidden rounded-lg border border-dark-border bg-dark-elevated text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleLayout('standard');
                      calendarRef.current?.getApi().changeView('dayGridMonth');
                    }}
                    className="px-3 py-1.5 text-zinc-300 transition-colors hover:bg-dark-hover"
                  >
                    Month
                  </button>
                  <button
                    type="button"
                    onClick={() => calendarRef.current?.getApi().changeView('timeGridWeek')}
                    className={`border-l border-dark-border px-3 py-1.5 transition-colors ${
                      activeViewType === 'timeGridWeek'
                        ? 'bg-indigo-500 text-white'
                        : 'text-zinc-300 hover:bg-dark-hover'
                    }`}
                  >
                    Week
                  </button>
                  <button
                    type="button"
                    onClick={() => calendarRef.current?.getApi().changeView('timeGridDay')}
                    className={`border-l border-dark-border px-3 py-1.5 transition-colors ${
                      activeViewType === 'timeGridDay'
                        ? 'bg-indigo-500 text-white'
                        : 'text-zinc-300 hover:bg-dark-hover'
                    }`}
                  >
                    Day
                  </button>
                </div>
              </div>

              <CompactScheduleView
                mode={effectiveLayoutMode === 'cards' ? 'cards' : 'compressed'}
                visibleDays={visibleDays}
                events={filteredEvents}
                routineOccurrences={routineOccurrences}
                routinesById={routinesById}
                stagedOverrides={stagedChanges}
                visibleStartTime={effectiveStartTime}
                visibleEndTime={effectiveEndTime}
                maskPrivateEvents={activeExportOptions?.maskPrivateEvents ?? false}
                preserveCategoryColors={activeExportOptions?.preserveCategoryColors ?? true}
                onSelectEvent={(ev) => setViewingEvent(ev)}
                onSelectRoutineOccurrence={(occ) => setViewingRoutineOccurrence(occ)}
                onCreateSlot={(dayDate, startMin, endMin) => {
                  const base = format(dayDate, 'yyyy-MM-dd');
                  const sh = String(Math.floor(startMin / 60)).padStart(2, '0');
                  const sm = String(startMin % 60).padStart(2, '0');
                  const eh = String(Math.floor(Math.min(1439, endMin) / 60)).padStart(2, '0');
                  const em = String(Math.min(1439, endMin) % 60).padStart(2, '0');
                  openNewEventModal({
                    start: fromApiDateTime(`${base}T${sh}:${sm}:00`),
                    end: fromApiDateTime(`${base}T${eh}:${em}:00`),
                  });
                }}
              />
            </div>
          )}

          <div className={showCompactView ? 'hidden' : 'block'}>
            <FullCalendar
              ref={calendarRef}
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
              slotMinTime={`${effectiveStartTime}:00`}
              slotMaxTime={`${effectiveEndTime}:00`}
              slotDuration="00:30:00"
              slotLabelInterval="01:00:00"
              expandRows={true}
              nowIndicator={true}
              dragScroll={true}
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
              eventDragStart={handleEventDragStart}
              eventDragStop={handleEventDragStop}
              eventDrop={(arg) => void handleEventMoveOrResize(arg)}
              eventResize={(arg) => void handleEventMoveOrResize(arg)}
              eventContent={renderPersonalEventContent}
            />
          </div>
        </div>
      )}

      {/* Floating Bottom Bar for Edit Mode Batch Staging */}
      {(isEditMode || stagedList.length > 0) && (
        <div
          role="region"
          aria-label="Staged schedule changes"
          className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-400/40 bg-dark-elevated/95 px-4 py-3 shadow-2xl backdrop-blur-md animate-fade-up sm:bottom-5 sm:w-auto sm:max-w-none sm:px-5"
        >
          <span className="text-xs font-semibold text-zinc-100">
            {stagedList.length} {stagedList.length === 1 ? 'change' : 'changes'} staged
          </span>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={stagedList.length === 0 || isSavingStaged}
              onClick={handleDiscardStagedChanges}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Discard Changes
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isSavingStaged}
              onClick={() => void handleSaveAllStagedChanges()}
              leftIcon={<Check className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Save All Changes
            </Button>
          </div>
        </div>
      )}

      {/* View personal event details modal */}
      <EventDetailModal
        event={viewingEvent}
        onClose={() => setViewingEvent(null)}
        onEdit={(ev) => {
          setViewingEvent(null);
          setDuplicatingEvent(null);
          setEditingEvent(ev);
          setInitialSlot(null);
          setFormOpen(true);
        }}
        onDuplicate={(ev) => {
          setViewingEvent(null);
          setEditingEvent(null);
          setDuplicatingEvent(ev);
          setInitialSlot(null);
          setFormOpen(true);
        }}
      />

      {/* View routine occurrence details & Surgical Shift modal */}
      <RoutineDetailModal
        occurrence={viewingRoutineOccurrence}
        routine={activeViewingRoutine}
        onClose={() => setViewingRoutineOccurrence(null)}
      />

      {/* Create / Edit / Duplicate event modal */}
      <EventFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setDuplicatingEvent(null);
        }}
        event={editingEvent}
        duplicateFromEvent={duplicatingEvent}
        initialSlot={initialSlot}
        categories={categories}
      />

      {/* Create N-Day Cycle Routine modal */}
      <RoutineFormModal
        key={String(routineFormOpen)}
        isOpen={routineFormOpen}
        onClose={() => setRoutineFormOpen(false)}
      />

      {/* Privacy-Safe High-Res PNG Export modal */}
      <ExportCalendarModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        calendarContainerRef={calendarContainerRef}
        defaultVisibleStartTime={visibleStartTime}
        defaultVisibleEndTime={visibleEndTime}
        defaultLayoutMode={scheduleLayout}
        onApplyExportOptions={setActiveExportOptions}
      />

      {/* Scoped confirmation dialog when a recurring event is dragged/resized outside Edit Mode */}
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
