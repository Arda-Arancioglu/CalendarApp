import { addDays, startOfDay } from 'date-fns';

export interface TimeInterval {
  start: Date;
  end: Date;
}

export interface FreeTimeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
}

export interface FreeTimeOptions {
  /** Start of daily search window in hours (default 8 = 08:00). */
  dayStartHour?: number;
  /** End of daily search window in hours (default 22 = 22:00). */
  dayEndHour?: number;
  /** Minimum slot length in minutes (default 30). */
  minDurationMinutes?: number;
}

/**
 * Computes free time slots across a date range where NO visible squad member is busy.
 *
 * Defaults agreed in the plan:
 * - Window: 08:00 to 22:00 local time each day
 * - Minimum slot duration: 30 minutes
 */
export function computeFreeTimeSlots(
  rangeStart: Date,
  rangeEnd: Date,
  busyIntervals: readonly TimeInterval[],
  options: FreeTimeOptions = {},
): FreeTimeSlot[] {
  const {
    dayStartHour = 8,
    dayEndHour = 22,
    minDurationMinutes = 30,
  } = options;

  const minMs = minDurationMinutes * 60_000;
  const result: FreeTimeSlot[] = [];

  // Walk day by day from rangeStart up to rangeEnd
  let cursor = startOfDay(rangeStart);
  const endLimit = rangeEnd.getTime();

  while (cursor.getTime() < endLimit) {
    const windowStart = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate(),
      dayStartHour,
      0,
      0,
      0,
    );
    const windowEnd = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate(),
      dayEndHour,
      0,
      0,
      0,
    );

    if (windowEnd.getTime() > windowStart.getTime()) {
      // Clip busy intervals to this day's [windowStart, windowEnd] window
      const clipped: TimeInterval[] = [];
      for (const item of busyIntervals) {
        const startMs = Math.max(item.start.getTime(), windowStart.getTime());
        const endMs = Math.min(item.end.getTime(), windowEnd.getTime());
        if (endMs > startMs) {
          clipped.push({ start: new Date(startMs), end: new Date(endMs) });
        }
      }

      // Sort by start time and merge overlapping busy intervals
      clipped.sort((a, b) => a.start.getTime() - b.start.getTime());
      const merged: TimeInterval[] = [];
      for (const interval of clipped) {
        const last = merged[merged.length - 1];
        if (!last) {
          merged.push({ ...interval });
        } else if (interval.start.getTime() <= last.end.getTime()) {
          if (interval.end.getTime() > last.end.getTime()) {
            last.end = interval.end;
          }
        } else {
          merged.push({ ...interval });
        }
      }

      // Collect gaps of >= minDurationMinutes between busy blocks
      let pointerMs = windowStart.getTime();
      for (const busy of merged) {
        const gapMs = busy.start.getTime() - pointerMs;
        if (gapMs >= minMs) {
          result.push({
            start: new Date(pointerMs),
            end: new Date(busy.start.getTime()),
            durationMinutes: Math.round(gapMs / 60_000),
          });
        }
        pointerMs = Math.max(pointerMs, busy.end.getTime());
      }

      const trailingGapMs = windowEnd.getTime() - pointerMs;
      if (trailingGapMs >= minMs) {
        result.push({
          start: new Date(pointerMs),
          end: new Date(windowEnd.getTime()),
          durationMinutes: Math.round(trailingGapMs / 60_000),
        });
      }
    }

    cursor = addDays(cursor, 1);
  }

  return result;
}
