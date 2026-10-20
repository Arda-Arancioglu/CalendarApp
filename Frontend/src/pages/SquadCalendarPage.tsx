import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type {
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventInput,
} from '@fullcalendar/core';
import {
  ArrowLeft,
  CalendarClock,
  EyeOff,
  Repeat,
  Settings2,
  Sparkles,
  User,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { ErrorState } from '../components/ui/States';
import { RoleBadge, VisibilityBadge } from '../components/squads/SquadBadges';
import {
  MemberLegend,
  type SquadCalendarLegendMember,
} from '../components/squads/MemberLegend';
import { useSquadDetail } from '../hooks/useSquads';
import { useSquadCalendar } from '../hooks/useSquadCalendar';
import { formatDateTime, fromApiDateTime, toApiDateTime } from '../utils/date';
import { getMemberColor, withAlpha } from '../utils/colors';
import { computeFreeTimeSlots, type TimeInterval } from '../utils/freeTime';
import type { DateRangeParams } from '../types/api';
import type { SquadCalendarEventDTO } from '../types/squad';

interface SquadEventMeta {
  taskId: number;
  userId: number;
  username: string;
  color: string;
  displayTitle: string;
  isBusyMasked: boolean;
  isFlexible: boolean;
  startTime: string;
  endTime: string;
}

/**
 * Per the brief: "In the squad calendar, a title of 'BUSY' (any case) or a
 * missing title renders as 'Busy' in a muted style."
 */
function isBusyEventTitle(title: string | null | undefined): boolean {
  if (!title) return true;
  const trimmed = title.trim();
  return trimmed === '' || trimmed.toUpperCase() === 'BUSY';
}

function renderSquadEventContent(arg: EventContentArg) {
  if (arg.event.display === 'background') {
    return (
      <div className="flex h-full w-full items-start justify-end p-1">
        <span className="inline-flex items-center gap-1 rounded-xs bg-emerald-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
          <Sparkles className="h-2.5 w-2.5 text-emerald-300" aria-hidden="true" />
          Everyone free
        </span>
      </div>
    );
  }

  const meta = arg.event.extendedProps.meta as SquadEventMeta | undefined;
  if (!meta) return null;

  const isTimeGrid = arg.view.type.startsWith('timeGrid');
  const { color, username, displayTitle, isBusyMasked, isFlexible } = meta;

  // Muted striped background for "Busy" events
  const backgroundStyle = isBusyMasked
    ? {
        backgroundColor: withAlpha(color, 0.16),
        backgroundImage: `repeating-linear-gradient(135deg, ${withAlpha(color, 0.22)} 0px, ${withAlpha(color, 0.22)} 6px, transparent 6px, transparent 12px)`,
        borderLeft: `4px ${isFlexible ? 'dashed' : 'solid'} ${withAlpha(color, 0.75)}`,
        borderTop: `1px ${isFlexible ? 'dashed' : 'solid'} ${withAlpha(color, 0.4)}`,
        borderRight: `1px ${isFlexible ? 'dashed' : 'solid'} ${withAlpha(color, 0.4)}`,
        borderBottom: `1px ${isFlexible ? 'dashed' : 'solid'} ${withAlpha(color, 0.4)}`,
      }
    : {
        backgroundColor: withAlpha(color, 0.34),
        borderLeft: `4px ${isFlexible ? 'dashed' : 'solid'} ${color}`,
        borderTop: `1px ${isFlexible ? 'dashed' : 'solid'} ${withAlpha(color, 0.5)}`,
        borderRight: `1px ${isFlexible ? 'dashed' : 'solid'} ${withAlpha(color, 0.5)}`,
        borderBottom: `1px ${isFlexible ? 'dashed' : 'solid'} ${withAlpha(color, 0.5)}`,
      };

  if (isTimeGrid) {
    return (
      <div
        className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[5px] px-2 py-1 text-xs leading-snug"
        style={backgroundStyle}
      >
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate font-semibold text-zinc-100">{username}</span>
            <span className="flex shrink-0 items-center gap-1">
              {isBusyMasked && (
                <EyeOff className="h-3 w-3 text-zinc-300" aria-label="Busy (details hidden)" />
              )}
              {isFlexible && (
                <Repeat className="h-3 w-3 text-amber-300" aria-label="Flexible time" />
              )}
            </span>
          </div>

          <p
            className={
              isBusyMasked
                ? 'mt-0.5 truncate italic text-zinc-300'
                : 'mt-0.5 line-clamp-2 font-medium text-white'
            }
          >
            {displayTitle}
          </p>
        </div>

        {arg.timeText && (
          <span className="truncate font-mono text-[10px] text-zinc-200/90">
            {arg.timeText}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex w-full items-center gap-1.5 overflow-hidden rounded-xs px-1.5 py-0.5 text-xs leading-tight"
      style={backgroundStyle}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="shrink-0 font-semibold text-zinc-100">{username}:</span>
      <span
        className={
          isBusyMasked ? 'truncate italic text-zinc-300' : 'truncate font-medium text-zinc-50'
        }
      >
        {displayTitle}
      </span>
      {isFlexible && (
        <Repeat className="ml-auto h-3 w-3 shrink-0 text-amber-300" aria-label="Flexible time" />
      )}
    </div>
  );
}

export function SquadCalendarPage() {
  const { id } = useParams<{ id: string }>();
  const parsedId = Number(id);
  const squadId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;

  const [visibleRange, setVisibleRange] = useState<DateRangeParams | null>(null);
  const [currentViewType, setCurrentViewType] = useState<string>('timeGridWeek');
  // Track members the user has manually toggled OFF (by default every member is ON)
  const [disabledUserIds, setDisabledUserIds] = useState<number[]>([]);
  const [showFreeTime, setShowFreeTime] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<SquadEventMeta | null>(null);

  const {
    data: squad,
    isLoading: isSquadLoading,
    isError: isSquadError,
    error: squadError,
    refetch: refetchSquad,
  } = useSquadDetail(squadId);

  const {
    data: calendarMembers = [],
    isLoading: isCalendarLoading,
    isFetching: isCalendarFetching,
    isError: isCalendarError,
    error: calendarError,
    refetch: refetchCalendar,
  } = useSquadCalendar(squadId, visibleRange);

  const handleDatesSet = (arg: DatesSetArg) => {
    setCurrentViewType(arg.view.type);
    const nextRange: DateRangeParams = {
      start: toApiDateTime(arg.start),
      end: toApiDateTime(arg.end),
    };
    setVisibleRange((prev) =>
      prev && prev.start === nextRange.start && prev.end === nextRange.end ? prev : nextRange,
    );
  };

  // Combine the squad detail `members` list with the `/calendar` response so even
  // MUTED members absent from the `/calendar` response appear in the legend as "hidden their calendar".
  const legendMembers = useMemo<SquadCalendarLegendMember[]>(() => {
    const calendarMap = new Map<number, { username: string; events: SquadCalendarEventDTO[] }>();
    for (const entry of calendarMembers) {
      calendarMap.set(entry.userId, {
        username: entry.username,
        events: Array.isArray(entry.events) ? entry.events : [],
      });
    }

    const baseList =
      squad?.members && squad.members.length > 0
        ? squad.members.map((m) => ({ userId: m.userId, username: m.username }))
        : calendarMembers.map((m) => ({ userId: m.userId, username: m.username }));

    return baseList.map((member, index) => {
      const fromCalendar = calendarMap.get(member.userId);
      const eventCount = fromCalendar?.events.length ?? 0;
      const isAbsentFromResponse = !fromCalendar;
      return {
        userId: member.userId,
        username: member.username,
        color: getMemberColor(index, member.userId),
        eventCount,
        isHiddenOrEmpty: isAbsentFromResponse || eventCount === 0,
        isAbsentFromResponse,
      };
    });
  }, [squad, calendarMembers]);

  const enabledUserIds = useMemo(
    () =>
      legendMembers
        .map((m) => m.userId)
        .filter((uid) => !disabledUserIds.includes(uid)),
    [legendMembers, disabledUserIds],
  );

  const toggleMember = (userId: number) => {
    setDisabledUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  // Build FullCalendar events + busy intervals for toggled-on members
  const { fcEvents, busyIntervals } = useMemo(() => {
    const colorByUser = new Map<number, SquadCalendarLegendMember>();
    for (const item of legendMembers) {
      colorByUser.set(item.userId, item);
    }

    const eventsOut: EventInput[] = [];
    const intervalsOut: TimeInterval[] = [];

    for (const memberBlock of calendarMembers) {
      if (!enabledUserIds.includes(memberBlock.userId)) continue;
      const legendInfo = colorByUser.get(memberBlock.userId);
      const color = legendInfo?.color ?? getMemberColor(-1, memberBlock.userId);

      for (const ev of memberBlock.events) {
        const masked = isBusyEventTitle(ev.title);
        const displayTitle = masked ? 'Busy' : (ev.title?.trim() ?? 'Busy');
        const start = fromApiDateTime(ev.startTime);
        const end = fromApiDateTime(ev.endTime);

        intervalsOut.push({ start, end });

        const meta: SquadEventMeta = {
          taskId: ev.taskId,
          userId: memberBlock.userId,
          username: memberBlock.username,
          color,
          displayTitle,
          isBusyMasked: masked,
          isFlexible: ev.isFlexible,
          startTime: ev.startTime,
          endTime: ev.endTime,
        };

        eventsOut.push({
          id: `member-${memberBlock.userId}-task-${ev.taskId}`,
          title: `${memberBlock.username}: ${displayTitle}`,
          start,
          end,
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          extendedProps: { meta },
        });
      }
    }

    return { fcEvents: eventsOut, busyIntervals: intervalsOut };
  }, [calendarMembers, enabledUserIds, legendMembers]);

  // Compute free-time slots (08:00–22:00, >= 30 mins) when enabled in Week/Day views
  const isTimeGrid = currentViewType.startsWith('timeGrid');
  const freeTimeEvents = useMemo<EventInput[]>(() => {
    if (!showFreeTime || !isTimeGrid || !visibleRange) return [];
    const start = fromApiDateTime(visibleRange.start);
    const end = fromApiDateTime(visibleRange.end);
    const slots = computeFreeTimeSlots(start, end, busyIntervals, {
      dayStartHour: 8,
      dayEndHour: 22,
      minDurationMinutes: 30,
    });

    return slots.map((slot, index) => ({
      id: `free-slot-${index}`,
      start: slot.start,
      end: slot.end,
      display: 'background',
      backgroundColor: 'rgba(16, 185, 129, 0.14)',
    }));
  }, [showFreeTime, isTimeGrid, visibleRange, busyIntervals]);

  const combinedEvents = useMemo(
    () => [...fcEvents, ...freeTimeEvents],
    [fcEvents, freeTimeEvents],
  );

  const handleEventClick = (arg: EventClickArg) => {
    const meta = arg.event.extendedProps.meta as SquadEventMeta | undefined;
    if (meta) setSelectedEvent(meta);
  };

  if (squadId === null) {
    return <ErrorState error={new Error('Invalid squad ID')} />;
  }

  if (isSquadError) {
    return (
      <div className="space-y-4">
        <Link
          to="/squads"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to squads
        </Link>
        <ErrorState error={squadError} onRetry={() => void refetchSquad()} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <Link
          to={`/squads/${squadId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to squad details
        </Link>
      </div>

      <PageHeader
        title={squad ? `${squad.squadName} · Calendar` : 'Squad calendar'}
        description="Combined member availability. Event descriptions are never shared with squads."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {isCalendarFetching && (
              <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                <Spinner size="sm" label="Syncing squad calendar" />
                <span className="hidden sm:inline">Syncing…</span>
              </span>
            )}
            {squad && (
              <>
                <RoleBadge role={squad.myRole} />
                <VisibilityBadge visibility={squad.myVisibility} />
              </>
            )}
            <Link to={`/squads/${squadId}`}>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Settings2 className="h-4 w-4" aria-hidden="true" />}
              >
                Squad settings &amp; visibility
              </Button>
            </Link>
          </div>
        }
      />

      <MemberLegend
        members={legendMembers}
        enabledUserIds={enabledUserIds}
        onToggleMember={toggleMember}
        onEnableAll={() => setDisabledUserIds([])}
        showFreeTime={showFreeTime}
        onToggleFreeTime={() => setShowFreeTime((v) => !v)}
        isTimeGrid={isTimeGrid}
      />

      {isCalendarError && calendarMembers.length === 0 ? (
        <ErrorState
          error={calendarError}
          onRetry={() => void refetchCalendar()}
          isRetrying={isCalendarFetching}
        />
      ) : (
        <div className="relative rounded-2xl border border-dark-border bg-dark-surface p-3 shadow-xl sm:p-5">
          {(isSquadLoading || (isCalendarLoading && visibleRange)) && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-dark-bg/50 backdrop-blur-[1px]">
              <Spinner size="lg" label="Loading squad calendar" />
            </div>
          )}

          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
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
            editable={false}
            selectable={false}
            dayMaxEvents={4}
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
            events={combinedEvents}
            eventClick={handleEventClick}
            eventContent={renderSquadEventContent}
          />
        </div>
      )}

      {/* Read-only squad event summary modal (never shows descriptions) */}
      <Modal
        isOpen={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        title="Member availability"
        maxWidth="sm"
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div
              className="rounded-xl border-l-4 p-4"
              style={{
                borderLeftColor: selectedEvent.color,
                backgroundColor: withAlpha(selectedEvent.color, 0.16),
              }}
            >
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <User className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="font-semibold text-zinc-100">{selectedEvent.username}</span>
              </div>
              <h3
                className={
                  selectedEvent.isBusyMasked
                    ? 'mt-1 text-base font-semibold italic text-zinc-200'
                    : 'mt-1 text-base font-semibold text-zinc-50'
                }
              >
                {selectedEvent.displayTitle}
              </h3>
              <div className="mt-2 flex items-center gap-2 text-xs text-zinc-300">
                <CalendarClock className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
                <span>
                  {formatDateTime(selectedEvent.startTime)} →{' '}
                  {formatDateTime(selectedEvent.endTime)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedEvent.isBusyMasked && (
                <Badge variant="zinc">
                  <EyeOff className="h-3 w-3" aria-hidden="true" />
                  Event details hidden by member's visibility
                </Badge>
              )}
              {selectedEvent.isFlexible && (
                <Badge variant="amber">
                  <Repeat className="h-3 w-3" aria-hidden="true" />
                  Flexible time
                </Badge>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <Button variant="secondary" size="sm" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
