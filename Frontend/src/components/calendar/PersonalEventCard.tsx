import { useEffect, useRef, useState } from 'react';
import type { EventContentArg } from '@fullcalendar/core';
import { format } from 'date-fns';
import { Dumbbell, Lock, Repeat, Waves } from 'lucide-react';
import type { EventResponseDTO } from '../../types/event';
import type { RoutineOccurrenceDTO, RoutineResponseDTO } from '../../types/routine';
import { DEFAULT_EVENT_COLOR, withAlpha } from '../../utils/colors';
import { isShortEvent } from '../../utils/eventLayout';
import { EventHoverPortalTooltip } from './EventHoverPortalTooltip';

export interface PersonalEventCardProps {
  arg: EventContentArg;
}

/**
 * Renders the centered crisp Micro-Badge according to priority:
 * 1. Priority 1 (Emoji): dto.emoji
 * 2. Priority 2 (Category Initial): first letter of category name with category background color
 * 3. Priority 3 (Title Initial): uppercase first letter of event title
 */
function renderPersonalMicroBadge(
  dto: EventResponseDTO | undefined,
  title: string,
  primaryColor: string,
  isMaskedPrivate: boolean,
) {
  // Priority 1: Emoji
  if (!isMaskedPrivate && dto?.emoji?.trim()) {
    return (
      <span
        aria-hidden="true"
        className="inline-block select-none text-[13px] sm:text-sm leading-none shrink-0 transition-transform group-hover:scale-110"
      >
        {dto.emoji.trim()}
      </span>
    );
  }

  // Priority 2: Category Initial
  const firstCat = dto?.categories?.[0];
  if (!isMaskedPrivate && firstCat && firstCat.name.trim()) {
    const initial = firstCat.name.trim().charAt(0).toUpperCase();
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm font-mono text-[9px] font-bold text-white shadow-xs select-none"
        style={{ backgroundColor: firstCat.color || primaryColor }}
        title={firstCat.name}
      >
        {initial}
      </span>
    );
  }

  // Priority 3: Title Initial
  const initial = title.trim().charAt(0).toUpperCase() || '•';
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-black/40 font-mono text-[10px] font-bold text-white select-none"
    >
      {initial}
    </span>
  );
}

/**
 * Renders a crisp Micro-Badge for routine cycle occurrences.
 */
function renderRoutineMicroBadge(primaryColor: string, dayLabel: string) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-black/40 font-mono text-[9px] font-bold text-indigo-100 shadow-xs select-none"
      title={dayLabel}
      style={{
        borderLeft: `2px solid ${primaryColor}`,
      }}
    >
      <Dumbbell className="h-2.5 w-2.5 text-indigo-200 shrink-0" aria-hidden="true" />
    </span>
  );
}

/**
 * Custom event card inside FullCalendar supporting both Personal Events and Cycle Routine Occurrences.
 * Adapts between:
 * - A single-row or centered Micro-Badge layout for short events (<= 45 mins)
 * - A standard multi-line layout for longer events (> 45 mins)
 * - A zero-clipping floating hover card via React Portal (EventHoverPortalTooltip)
 */
export function PersonalEventCard({ arg }: PersonalEventCardProps) {
  const kind = (arg.event.extendedProps.kind as 'event' | 'routine' | undefined) ?? 'event';
  const color = (arg.event.extendedProps.primaryColor as string | undefined) ?? DEFAULT_EVENT_COLOR;
  const isTimeGrid = arg.view.type.startsWith('timeGrid');
  const isShort = isShortEvent(arg);

  const cardRef = useRef<HTMLDivElement>(null);
  const [isUltraNarrow, setIsUltraNarrow] = useState<boolean>(false);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsUltraNarrow(entry.contentRect.width < 65);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleMouseEnter = (e: React.MouseEvent) => {
    setHoverCoords({ x: e.clientX, y: e.clientY });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    setHoverCoords({ x: e.clientX, y: e.clientY });
  };
  const handleMouseLeave = () => {
    setHoverCoords(null);
  };

  const formattedStartTime =
    arg.event.start instanceof Date && !isNaN(arg.event.start.getTime())
      ? format(arg.event.start, 'HH:mm')
      : '';
  const formattedEndTime =
    arg.event.end instanceof Date && !isNaN(arg.event.end.getTime())
      ? format(arg.event.end, 'HH:mm')
      : '';
  const timeSpan =
    formattedStartTime && formattedEndTime
      ? `${formattedStartTime} - ${formattedEndTime}`
      : formattedStartTime || arg.timeText || '';

  const tooltipTitle = timeSpan ? `${timeSpan} · ${arg.event.title}` : arg.event.title;

  if (kind === 'routine') {
    const occ = arg.event.extendedProps.routineOccurrence as RoutineOccurrenceDTO;
    const routine = arg.event.extendedProps.routine as RoutineResponseDTO | undefined;
    const dayLabel = routine?.cycleLength
      ? `Day ${occ.dayIndex + 1} of ${routine.cycleLength}`
      : `Day ${occ.dayIndex + 1}`;
    const routineKey = `routine_${occ.routineId}_${occ.routineItemId}_${occ.startDate}`;

    if (isTimeGrid) {
      if (isShort) {
        const routineBadge = renderRoutineMicroBadge(color, dayLabel);
        return (
          <div
            ref={cardRef}
            key={routineKey}
            title={tooltipTitle}
            onMouseEnter={handleMouseEnter}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`group relative flex h-full w-full items-center ${
              isUltraNarrow ? 'justify-center' : 'justify-start'
            } gap-1.5 overflow-hidden rounded-md px-1.5 py-0.5 text-xs leading-none text-zinc-50 shadow-md ring-1 ring-white/10`}
            style={{
              backgroundColor: withAlpha(color, 0.40),
              borderLeft: `3px solid ${color}`,
              borderTop: `1px solid ${withAlpha(color, 0.65)}`,
              borderRight: `1px solid ${withAlpha(color, 0.65)}`,
              borderBottom: `1px solid ${withAlpha(color, 0.65)}`,
            }}
          >
            {/* Screen-reader accessible full timespan */}
            {timeSpan && <span className="sr-only">{timeSpan}</span>}

            {isUltraNarrow ? (
              <div className="flex flex-col items-center justify-center">
                {routineBadge}
                {formattedStartTime && (
                  <span className="mt-0.5 font-mono text-[9px] font-semibold text-zinc-100/90 leading-none">
                    {formattedStartTime}
                  </span>
                )}
              </div>
            ) : (
              <>
                <div className="shrink-0 flex items-center justify-center">
                  {routineBadge}
                </div>
                {formattedStartTime && (
                  <span className="shrink-0 font-mono text-[10px] font-semibold text-zinc-100/90 whitespace-nowrap">
                    {formattedStartTime}
                  </span>
                )}
                <span className="min-w-0 truncate text-[11px] font-semibold text-white whitespace-nowrap">
                  {arg.event.title}
                </span>
                <span
                  title={`Routine (${dayLabel})`}
                  className="ml-auto shrink-0 inline-flex items-center gap-1 rounded-xs bg-black/35 px-1 py-0.5 text-[9px] font-semibold text-indigo-100 whitespace-nowrap"
                >
                  <Dumbbell className="h-2.5 w-2.5 shrink-0 text-indigo-200" aria-hidden="true" />
                  <span>{dayLabel}</span>
                </span>
              </>
            )}

            {hoverCoords && (
              <EventHoverPortalTooltip
                coords={hoverCoords}
                data={{
                  timeSpan,
                  title: arg.event.title,
                  subtitle: dayLabel,
                  description: occ.description,
                }}
              />
            )}
          </div>
        );
      }

      return (
        <div
          ref={cardRef}
          key={routineKey}
          title={tooltipTitle}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[5px] px-2 py-1 text-xs leading-snug text-zinc-50"
          style={{
            backgroundColor: withAlpha(color, 0.30),
            borderLeft: `4px solid ${color}`,
            borderTop: `1px solid ${withAlpha(color, 0.65)}`,
            borderRight: `1px solid ${withAlpha(color, 0.65)}`,
            borderBottom: `1px solid ${withAlpha(color, 0.65)}`,
          }}
        >
          <div className="min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-1">
              {arg.timeText && (
                <span className="truncate font-mono text-[11px] font-semibold text-zinc-100/95 whitespace-nowrap">
                  {arg.timeText}
                </span>
              )}
              <span
                title={`Routine (${dayLabel})`}
                className="inline-flex shrink-0 items-center gap-1 rounded-xs bg-black/35 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-100 whitespace-nowrap"
              >
                <Dumbbell className="h-2.5 w-2.5 text-indigo-200" aria-hidden="true" />
                <span>{dayLabel}</span>
              </span>
            </div>
            <p className="mt-0.5 line-clamp-2 font-semibold text-white">{arg.event.title}</p>
            {occ.description && (
              <p className="mt-0.5 line-clamp-1 overflow-hidden text-[11px] text-zinc-200/80">
                {occ.description}
              </p>
            )}
          </div>

          {hoverCoords && (
            <EventHoverPortalTooltip
              coords={hoverCoords}
              data={{
                timeSpan,
                title: arg.event.title,
                subtitle: dayLabel,
                description: occ.description,
              }}
            />
          )}
        </div>
      );
    }

    return (
      <div
        key={routineKey}
        title={tooltipTitle}
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
        <span className="min-w-0 truncate font-medium whitespace-nowrap">{arg.event.title}</span>
        <span className="ml-auto shrink-0 rounded-xs bg-black/35 px-1 py-0.5 font-mono text-[9px] font-semibold text-indigo-100 whitespace-nowrap">
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
    if (isShort) {
      const badge = renderPersonalMicroBadge(dto, arg.event.title, color, isMaskedPrivate);
      return (
        <div
          ref={cardRef}
          key={eventKey}
          title={tooltipTitle}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`group relative flex h-full w-full items-center ${
            isUltraNarrow ? 'justify-center' : 'justify-start'
          } gap-1.5 overflow-hidden rounded-md px-1.5 py-0.5 text-xs leading-none text-zinc-50 shadow-md ring-1 ring-white/10`}
          style={{
            backgroundColor: withAlpha(color, 0.42),
            borderLeft: `3px ${isFlexible ? 'dashed' : 'solid'} ${color}`,
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
          {/* Accessible timeSpan for screen readers & tests */}
          {timeSpan && <span className="sr-only">{timeSpan}</span>}

          {isUltraNarrow ? (
            <div className="flex flex-col items-center justify-center">
              {badge}
              {formattedStartTime && (
                <span className="mt-0.5 font-mono text-[9px] font-semibold text-zinc-100/90 leading-none">
                  {formattedStartTime}
                </span>
              )}
            </div>
          ) : (
            <>
              {/* Single Micro-Badge (Emoji / Initial) */}
              <div className="shrink-0 flex items-center justify-center">
                {badge}
              </div>

              {/* Start time & Title */}
              {formattedStartTime && (
                <span className="shrink-0 font-mono text-[10px] font-semibold text-zinc-100/90 whitespace-nowrap">
                  {formattedStartTime}
                </span>
              )}
              <span className="min-w-0 truncate text-[11px] font-semibold text-white whitespace-nowrap">
                {arg.event.title}
              </span>
              <span className="ml-auto shrink-0 flex items-center gap-1">
                {isStaged && (
                  <span
                    title="Staged change"
                    className="rounded-xs bg-amber-500/30 px-1 font-mono text-[9px] font-bold text-amber-200 leading-none"
                  >
                    •
                  </span>
                )}
                {isRecurring && (
                  <span title="Recurring series" className="inline-flex">
                    <Repeat
                      className="h-2.5 w-2.5 shrink-0 text-indigo-200"
                      aria-label="Recurring series"
                    />
                  </span>
                )}
                {isFlexible && (
                  <span title="Flexible time" className="inline-flex">
                    <Waves
                      className="h-2.5 w-2.5 shrink-0 text-amber-300"
                      aria-label="Flexible time"
                    />
                  </span>
                )}
                {isPrivate && (
                  <span title="Private event" className="inline-flex">
                    <Lock
                      className="h-2.5 w-2.5 shrink-0 text-zinc-100"
                      aria-label="Private event"
                    />
                  </span>
                )}
              </span>
            </>
          )}

          {/* Floating Hover Portal Tooltip */}
          {hoverCoords && (
            <EventHoverPortalTooltip
              coords={hoverCoords}
              data={{
                timeSpan,
                title: isMaskedPrivate ? 'BUSY' : arg.event.title,
                emoji: !isMaskedPrivate ? dto?.emoji : null,
                categories: !isMaskedPrivate ? dto?.categories : undefined,
                description: !isMaskedPrivate ? dto?.description : null,
                isBusyMasked: isMaskedPrivate,
                isFlexible,
              }}
            />
          )}
        </div>
      );
    }

    return (
      <div
        ref={cardRef}
        key={eventKey}
        title={tooltipTitle}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
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
        <div className="min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-1">
            {arg.timeText && (
              <span className="truncate font-mono text-[11px] font-semibold text-zinc-100/95 whitespace-nowrap">
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
                {dto.emoji.trim()}
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

        {hoverCoords && (
          <EventHoverPortalTooltip
            coords={hoverCoords}
            data={{
              timeSpan,
              title: isMaskedPrivate ? 'BUSY' : arg.event.title,
              emoji: !isMaskedPrivate ? dto?.emoji : null,
              categories: !isMaskedPrivate ? dto?.categories : undefined,
              description: !isMaskedPrivate ? dto?.description : null,
              isBusyMasked: isMaskedPrivate,
              isFlexible,
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      key={eventKey}
      title={tooltipTitle}
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
        <span className="shrink-0 font-mono text-[10px] font-medium text-zinc-200/90 whitespace-nowrap">
          {arg.timeText}
        </span>
      )}
      <span className="truncate font-medium whitespace-nowrap">
        {!isMaskedPrivate && dto?.emoji?.trim() && (
          <span className="mr-1 inline-block select-none text-[11px] sm:text-xs">
            {dto.emoji.trim()}
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
