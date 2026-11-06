import { useMemo, useState } from 'react';
import { format, isSameDay, startOfDay } from 'date-fns';
import { Clock, Dumbbell, Lock, Plus, Repeat, Sparkles, Waves } from 'lucide-react';
import { DEFAULT_EVENT_COLOR, normalizeHexColor, withAlpha } from '../../utils/colors';
import { fromApiDateTime } from '../../utils/date';
import {
  buildCompressedTimeSegments,
  formatMinutes24,
  parseTimeToMinutes,
  type CompressedSegment,
  type UnifiedScheduleItem,
} from '../../utils/scheduleCompression';
import type { EventResponseDTO } from '../../types/event';
import type { RoutineOccurrenceDTO, RoutineResponseDTO } from '../../types/routine';

interface DayLanePlacement {
  item: UnifiedScheduleItem;
  startSegIndex: number;
  endSegIndex: number; // exclusive
  laneIndex: number;
  totalLanes: number;
}

function computeDayLanePlacements(
  dayItems: UnifiedScheduleItem[],
  segments: CompressedSegment[],
  minWindow: number,
  maxWindow: number,
): DayLanePlacement[] {
  const mapped: {
    item: UnifiedScheduleItem;
    startSegIndex: number;
    endSegIndex: number;
  }[] = [];

  for (const item of dayItems) {
    const s = Math.max(minWindow, Math.min(maxWindow, item.startMin));
    const e = Math.max(minWindow, Math.min(maxWindow, item.endMin));
    if (e <= s) continue;

    const firstSeg = segments.findIndex((seg) => seg.startMin >= s && seg.endMin <= e);
    let lastSeg = -1;
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i]!;
      if (seg.startMin >= s && seg.endMin <= e) {
        lastSeg = i + 1;
        break;
      }
    }
    if (firstSeg !== -1 && lastSeg !== -1 && lastSeg > firstSeg) {
      mapped.push({ item, startSegIndex: firstSeg, endSegIndex: lastSeg });
    }
  }

  mapped.sort(
    (a, b) =>
      a.startSegIndex - b.startSegIndex ||
      b.endSegIndex - a.endSegIndex ||
      a.item.title.localeCompare(b.item.title),
  );

  const placements: DayLanePlacement[] = [];
  const laneEndSeg: number[] = [];

  for (const entry of mapped) {
    let assignedLane = -1;
    for (let l = 0; l < laneEndSeg.length; l++) {
      if ((laneEndSeg[l] ?? 0) <= entry.startSegIndex) {
        assignedLane = l;
        laneEndSeg[l] = entry.endSegIndex;
        break;
      }
    }
    if (assignedLane === -1) {
      assignedLane = laneEndSeg.length;
      laneEndSeg.push(entry.endSegIndex);
    }
    placements.push({
      ...entry,
      laneIndex: assignedLane,
      totalLanes: 1,
    });
  }

  for (let i = 0; i < placements.length; i++) {
    const current = placements[i]!;
    let maxLane = current.laneIndex;
    for (let j = 0; j < placements.length; j++) {
      const other = placements[j]!;
      const overlaps =
        current.startSegIndex < other.endSegIndex &&
        current.endSegIndex > other.startSegIndex;
      if (overlaps && other.laneIndex > maxLane) {
        maxLane = other.laneIndex;
      }
    }
    current.totalLanes = maxLane + 1;
  }

  return placements;
}

export interface CompactScheduleViewProps {
  mode: 'cards' | 'compressed';
  visibleDays: Date[];
  events: EventResponseDTO[];
  routineOccurrences: RoutineOccurrenceDTO[];
  routinesById: Map<number, RoutineResponseDTO>;
  stagedOverrides?: Record<
    string,
    { updatedStart: string; updatedEnd: string }
  >;
  visibleStartTime: string; // 'HH:mm' in 24h
  visibleEndTime: string; // 'HH:mm' in 24h
  maskPrivateEvents?: boolean;
  preserveCategoryColors?: boolean;
  onSelectEvent: (event: EventResponseDTO) => void;
  onSelectRoutineOccurrence: (occurrence: RoutineOccurrenceDTO) => void;
  onCreateSlot?: (date: Date, startMin: number, endMin: number) => void;
}

const NEUTRAL_SLATE_COLOR = '#64748B';

export function CompactScheduleView({
  mode,
  visibleDays,
  events,
  routineOccurrences,
  routinesById,
  stagedOverrides = {},
  visibleStartTime,
  visibleEndTime,
  maskPrivateEvents = false,
  preserveCategoryColors = true,
  onSelectEvent,
  onSelectRoutineOccurrence,
  onCreateSlot,
}: CompactScheduleViewProps) {
  const [today] = useState(() => startOfDay(new Date()));
  const minWindow = parseTimeToMinutes(visibleStartTime || '00:00');
  const rawMax = parseTimeToMinutes(visibleEndTime || '24:00');
  const maxWindow = rawMax > minWindow ? rawMax : 1440;

  const unifiedItems = useMemo<UnifiedScheduleItem[]>(() => {
    const dayKeySet = new Set(visibleDays.map((d) => format(d, 'yyyy-MM-dd')));
    const list: UnifiedScheduleItem[] = [];

    for (const ev of events) {
      const key = String(ev.occurrenceId || ev.eventId);
      const staged = stagedOverrides[key];
      const startIso = staged ? staged.updatedStart : ev.startTime;
      const endIso = staged ? staged.updatedEnd : ev.endTime;

      const startDateObj = fromApiDateTime(startIso);
      const endDateObj = fromApiDateTime(endIso);
      const dateKey = format(startDateObj, 'yyyy-MM-dd');
      if (!dayKeySet.has(dateKey)) continue;

      const startMin = startDateObj.getHours() * 60 + startDateObj.getMinutes();
      const rawEndMin = isSameDay(startDateObj, endDateObj)
        ? endDateObj.getHours() * 60 + endDateObj.getMinutes()
        : 1440;
      const endMin = Math.max(startMin + 5, rawEndMin);

      if (endMin <= minWindow || startMin >= maxWindow) continue;

      const rawColor = normalizeHexColor(ev.categories[0]?.color ?? DEFAULT_EVENT_COLOR);
      const color = preserveCategoryColors ? rawColor : NEUTRAL_SLATE_COLOR;
      const masked = maskPrivateEvents && ev.isPrivate;

      list.push({
        id: key,
        kind: 'event',
        title: masked ? 'BUSY' : ev.title,
        description: masked ? null : ev.description ?? null,
        emoji: masked ? null : ev.emoji ?? null,
        dateKey,
        startMin,
        endMin,
        color,
        isFlexible: ev.isFlexible,
        isPrivate: ev.isPrivate,
        isRecurring: Boolean(ev.recurrenceType && ev.recurrenceType !== 'NONE'),
        isStaged: Boolean(staged),
        categories: masked ? [] : ev.categories,
        eventDto: ev,
      });
    }

    for (const occ of routineOccurrences) {
      if (occ.isRestDay) continue;
      if (!dayKeySet.has(occ.startDate)) continue;

      const startMin = parseTimeToMinutes(occ.startTime ?? '09:00');
      const rawEndMin = parseTimeToMinutes(occ.endTime ?? '10:00');
      const endMin = rawEndMin > startMin ? rawEndMin : startMin + 60;

      if (endMin <= minWindow || startMin >= maxWindow) continue;

      const routine = routinesById.get(occ.routineId);
      const rawColor = normalizeHexColor(occ.color ?? routine?.color ?? DEFAULT_EVENT_COLOR);
      const color = preserveCategoryColors ? rawColor : NEUTRAL_SLATE_COLOR;
      const routineDayLabel = routine?.cycleLength
        ? `Day ${occ.dayIndex + 1} of ${routine.cycleLength}`
        : `Day ${occ.dayIndex + 1}`;

      list.push({
        id: `routine_${occ.routineId}_${occ.routineItemId}_${occ.startDate}`,
        kind: 'routine',
        title: occ.title,
        description: occ.description ?? null,
        dateKey: occ.startDate,
        startMin,
        endMin,
        color,
        isFlexible: false,
        isPrivate: false,
        isRecurring: false,
        isStaged: false,
        routineDayLabel,
        categories: [],
        routineOccurrence: occ,
      });
    }

    return list.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  }, [
    visibleDays,
    events,
    routineOccurrences,
    routinesById,
    stagedOverrides,
    minWindow,
    maxWindow,
    maskPrivateEvents,
    preserveCategoryColors,
  ]);

  const handleCardClick = (item: UnifiedScheduleItem) => {
    if (item.kind === 'routine' && item.routineOccurrence) {
      onSelectRoutineOccurrence(item.routineOccurrence);
    } else if (item.eventDto) {
      onSelectEvent(item.eventDto);
    }
  };

  // ============================================================================
  // COMPACT VARIETY 1: Equal-Height Per-Day Task Cards + Uniform Free-Time Slots
  // ============================================================================
  if (mode === 'cards') {
    return (
      <div
        data-testid="compact-cards-view"
        className="space-y-3"
      >
        <div
          className={
            visibleDays.length === 1
              ? 'grid grid-cols-1 gap-3'
              : 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7'
          }
        >
          {visibleDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const isToday = isSameDay(day, today);
            const dayItems = unifiedItems.filter((it) => it.dateKey === dateKey);

            const elements: React.ReactNode[] = [];
            let cursorMin = minWindow;

            dayItems.forEach((item, idx) => {
              const clampedStart = Math.max(minWindow, item.startMin);
              const clampedEnd = Math.min(maxWindow, item.endMin);

              if (clampedStart > cursorMin) {
                const gapStart = cursorMin;
                const gapEnd = clampedStart;
                elements.push(
                  <button
                    key={`gap_${dateKey}_${gapStart}_${gapEnd}`}
                    type="button"
                    onClick={() => onCreateSlot?.(day, gapStart, Math.min(gapEnd, gapStart + 60))}
                    className="group flex h-7 w-full items-center justify-between rounded-lg border border-dashed border-dark-border/80 bg-dark-bg/40 px-2.5 text-[11px] text-zinc-400 transition-colors hover:border-indigo-400/50 hover:bg-indigo-500/10 hover:text-indigo-200"
                    title="Click to schedule in this free time window"
                  >
                    <span className="inline-flex min-w-0 items-center gap-1 truncate font-mono text-[10px]">
                      <Sparkles className="h-2.5 w-2.5 text-emerald-400" aria-hidden="true" />
                      <span>
                        Free Time ({formatMinutes24(gapStart)} – {formatMinutes24(gapEnd)})
                      </span>
                    </span>
                    <Plus className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>,
                );
              }

              elements.push(
                <button
                  key={`${item.id}_${idx}`}
                  type="button"
                  onClick={() => handleCardClick(item)}
                  className="flex min-h-[68px] h-auto w-full min-w-0 flex-col justify-between gap-1 overflow-hidden rounded-xl px-2.5 py-2 text-left text-xs text-zinc-50 shadow-sm transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  style={{
                    backgroundColor: withAlpha(item.color, 0.30),
                    borderLeft: `4px ${item.isFlexible ? 'dashed' : 'solid'} ${item.color}`,
                    borderTop: `1px ${item.isFlexible ? 'dashed' : 'solid'} ${withAlpha(item.color, 0.55)}`,
                    borderRight: `1px ${item.isFlexible ? 'dashed' : 'solid'} ${withAlpha(item.color, 0.55)}`,
                    borderBottom: `1px ${item.isFlexible ? 'dashed' : 'solid'} ${withAlpha(item.color, 0.55)}`,
                  }}
                >
                  <div className="flex w-full flex-wrap items-center justify-between gap-1">
                    <span className="font-mono text-[11px] font-semibold text-zinc-100">
                      {formatMinutes24(item.startMin)} – {formatMinutes24(item.endMin)}
                    </span>

                    <span className="flex shrink-0 flex-wrap items-center gap-1">
                      {item.kind === 'routine' && item.routineDayLabel && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-black/35 px-1 py-0.5 font-mono text-[9px] font-semibold text-indigo-100">
                          <Dumbbell className="h-2.5 w-2.5 text-indigo-200" aria-hidden="true" />
                          <span>{item.routineDayLabel}</span>
                        </span>
                      )}
                      {item.isRecurring && (
                        <Repeat className="h-3 w-3 text-indigo-200" aria-label="Recurring series" />
                      )}
                      {item.isFlexible && (
                        <Waves className="h-3 w-3 text-amber-300" aria-label="Flexible time" />
                      )}
                      {item.isPrivate && (
                        <Lock className="h-3 w-3 text-zinc-100" aria-label="Private event" />
                      )}
                    </span>
                  </div>

                  <p className="line-clamp-2 break-words font-semibold text-white">
                    {item.emoji?.trim() && (
                      <span className="mr-1.5 inline-block select-none text-[13px] sm:text-[14px]">
                        {item.emoji}
                      </span>
                    )}
                    {item.title}
                  </p>
                </button>,
              );

              if (clampedEnd > cursorMin) {
                cursorMin = clampedEnd;
              }
            });

            if (cursorMin < maxWindow) {
              const tailStart = cursorMin;
              const tailEnd = maxWindow;
              elements.push(
                <button
                  key={`tail_gap_${dateKey}_${tailStart}_${tailEnd}`}
                  type="button"
                  onClick={() => onCreateSlot?.(day, tailStart, Math.min(tailEnd, tailStart + 60))}
                  className="group flex h-7 w-full items-center justify-between rounded-lg border border-dashed border-dark-border/80 bg-dark-bg/40 px-2.5 text-[11px] text-zinc-400 transition-colors hover:border-indigo-400/50 hover:bg-indigo-500/10 hover:text-indigo-200"
                >
                  <span className="inline-flex min-w-0 items-center gap-1 truncate font-mono text-[10px]">
                    <Sparkles className="h-2.5 w-2.5 text-emerald-400" aria-hidden="true" />
                    <span>
                      Free Time ({formatMinutes24(tailStart)} – {formatMinutes24(tailEnd)})
                    </span>
                  </span>
                  <Plus className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>,
              );
            }

            return (
              <div
                key={dateKey}
                className={`flex min-w-0 flex-col rounded-xl border p-2.5 ${
                  isToday
                    ? 'border-indigo-400/50 bg-indigo-500/5'
                    : 'border-dark-border bg-dark-bg/35'
                }`}
              >
                <div className="mb-2.5 flex items-center justify-between border-b border-dark-border/80 pb-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      {format(day, 'EEE')}
                    </p>
                    <p
                      className={`text-sm font-bold ${
                        isToday ? 'text-indigo-300' : 'text-zinc-100'
                      }`}
                    >
                      {format(day, 'MMM d')}
                    </p>
                  </div>
                  <span className="rounded-md bg-dark-elevated px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                    {dayItems.length} {dayItems.length === 1 ? 'task' : 'tasks'}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">{elements}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ============================================================================
  // COMPACT VARIETY 2: Coordinate-Compressed Week/Day TimeGrid (Spanning Blocks)
  // ============================================================================
  const segments = buildCompressedTimeSegments(unifiedItems, minWindow, maxWindow);
  const gridRowTracks = segments
    .map((seg) => (seg.isActiveAcrossAnyDay ? '58px' : '28px'))
    .join(' ');

  return (
    <div
      data-testid="coordinate-compressed-grid"
      className="overflow-x-auto"
    >
      <div className={visibleDays.length === 1 ? 'min-w-0' : 'min-w-[720px]'}>
        {/* Header Row: Time Column + Day Columns */}
        <div
          className="grid border-b border-dark-border bg-dark-elevated/50"
          style={{
            gridTemplateColumns: `64px repeat(${visibleDays.length}, minmax(0, 1fr))`,
          }}
        >
          <div className="flex items-center justify-center border-r border-dark-border px-2 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            <Clock className="mr-1 h-3 w-3 text-indigo-300" aria-hidden="true" />
            Time
          </div>
          {visibleDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const isToday = isSameDay(day, today);
            return (
              <div
                key={dateKey}
                className={`flex items-center justify-between border-r border-dark-border px-3 py-2.5 last:border-r-0 ${
                  isToday ? 'bg-indigo-500/10' : ''
                }`}
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  {format(day, 'EEE')}
                </span>
                <span
                  className={`rounded-md px-1.5 py-0.5 font-mono text-xs font-bold ${
                    isToday ? 'bg-indigo-500 text-white' : 'text-zinc-200'
                  }`}
                >
                  {format(day, 'MMM d')}
                </span>
              </div>
            );
          })}
        </div>

        {/* Coordinate-Compressed Body */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: `64px repeat(${visibleDays.length}, minmax(0, 1fr))`,
          }}
        >
          {/* Left Axis: Elementary Time Cut Intervals [t_i, t_{i+1}] */}
          <div
            className="grid border-r border-dark-border bg-dark-bg/50"
            style={{ gridTemplateRows: gridRowTracks }}
          >
            {segments.map((seg) => (
              <div
                key={`axis_${seg.startMin}_${seg.endMin}`}
                className={`flex flex-col items-center justify-center border-b border-dark-border/70 px-1.5 font-mono leading-tight ${
                  seg.isActiveAcrossAnyDay
                    ? 'text-[11px] font-semibold text-zinc-200'
                    : 'bg-dark-bg/80 text-[10px] text-zinc-500'
                }`}
              >
                <span>{formatMinutes24(seg.startMin)}</span>
                <span className="text-[9px] text-zinc-500">↓ {formatMinutes24(seg.endMin)}</span>
              </div>
            ))}
          </div>

          {/* Day Columns with Row-Spanning Task Blocks */}
          {visibleDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const isToday = isSameDay(day, today);
            const dayItems = unifiedItems.filter((it) => it.dateKey === dateKey);
            const placements = computeDayLanePlacements(
              dayItems,
              segments,
              minWindow,
              maxWindow,
            );

            return (
              <div
                key={`col_${dateKey}`}
                className={`relative grid border-r border-dark-border last:border-r-0 ${
                  isToday ? 'bg-indigo-500/[0.03]' : ''
                }`}
                style={{ gridTemplateRows: gridRowTracks }}
              >
                {segments.map((seg) => (
                  <button
                    key={`cell_${dateKey}_${seg.index}`}
                    type="button"
                    onClick={() =>
                      onCreateSlot?.(day, seg.startMin, Math.min(seg.endMin, seg.startMin + 60))
                    }
                    aria-label={`Schedule on ${dateKey} at ${formatMinutes24(seg.startMin)}`}
                    style={{ gridRow: `${seg.index + 1} / ${seg.index + 2}`, gridColumn: '1 / 2' }}
                    className={`w-full border-b border-dark-border/60 text-left transition-colors hover:bg-indigo-500/10 ${
                      seg.isActiveAcrossAnyDay
                        ? ''
                        : 'bg-[repeating-linear-gradient(-45deg,transparent,transparent_6px,rgba(255,255,255,0.015)_6px,rgba(255,255,255,0.015)_12px)]'
                    }`}
                  >
                    {!seg.isActiveAcrossAnyDay && (
                      <span className="px-2 font-mono text-[10px] text-zinc-500">
                        Idle {formatMinutes24(seg.startMin)}–{formatMinutes24(seg.endMin)}
                      </span>
                    )}
                  </button>
                ))}

                {placements.map((pl) => {
                  const { item, startSegIndex, endSegIndex, laneIndex, totalLanes } = pl;
                  const widthPct = 100 / totalLanes;
                  const leftPct = laneIndex * widthPct;

                  return (
                    <div
                      key={item.id}
                      style={{
                        gridRow: `${startSegIndex + 1} / ${endSegIndex + 1}`,
                        gridColumn: '1 / 2',
                        width: `calc(${widthPct}% - 4px)`,
                        marginLeft: `calc(${leftPct}% + 2px)`,
                      }}
                      className="z-10 my-[2px] flex"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(item);
                        }}
                        className="flex h-full w-full flex-col justify-between overflow-hidden rounded-lg px-2 py-1 text-left text-xs leading-snug text-zinc-50 shadow-md transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        style={{
                          backgroundColor: withAlpha(item.color, 0.34),
                          borderLeft: `4px ${item.isFlexible ? 'dashed' : 'solid'} ${item.color}`,
                          borderTop: `1px ${item.isFlexible ? 'dashed' : 'solid'} ${withAlpha(item.color, 0.55)}`,
                          borderRight: `1px ${item.isFlexible ? 'dashed' : 'solid'} ${withAlpha(item.color, 0.55)}`,
                          borderBottom: `1px ${item.isFlexible ? 'dashed' : 'solid'} ${withAlpha(item.color, 0.55)}`,
                        }}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate font-mono text-[10px] font-semibold text-zinc-100">
                              {formatMinutes24(item.startMin)}–{formatMinutes24(item.endMin)}
                            </span>
                            <span className="flex shrink-0 items-center gap-1">
                              {item.kind === 'routine' && item.routineDayLabel && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-black/35 px-1 py-0.2 font-mono text-[9px] font-semibold text-indigo-100">
                                  <Dumbbell className="h-2.5 w-2.5 text-indigo-200" />
                                  <span>{item.routineDayLabel}</span>
                                </span>
                              )}
                              {item.isRecurring && (
                                <Repeat className="h-3 w-3 text-indigo-200" />
                              )}
                              {item.isFlexible && (
                                <Waves className="h-3 w-3 text-amber-300" />
                              )}
                              {item.isPrivate && (
                                <Lock className="h-3 w-3 text-zinc-100" />
                              )}
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 font-semibold text-white">
                            {item.emoji?.trim() && (
                              <span className="mr-1.5 inline-block select-none text-[13px] sm:text-[14px]">
                                {item.emoji}
                              </span>
                            )}
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="mt-0.5 line-clamp-1 text-[10px] text-zinc-200/80">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
