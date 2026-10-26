import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  getDay,
  isValid,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { fromApiDate, fromApiDateTime, toApiDate } from './date';
import type { ApiDate } from '../types/api';
import type {
  EventRequestDTO,
  EventResponseDTO,
  EventScopeRequestDTO,
  WeekdayName,
} from '../types/event';

export type ScopeChoice = 'THIS_ONLY' | 'THIS_AND_FOLLOWING' | 'ALL' | 'CUSTOM';

export const QUICK_SELECT_COUNTS = [2, 4, 8, 12] as const;
export const WEEKDAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;

export interface WeekdayOption {
  value: WeekdayName;
  shortLabel: string;
  fullLabel: string;
  mondayOffset: number;
}

export const WEEKDAY_OPTIONS: readonly WeekdayOption[] = [
  { value: 'MONDAY', shortLabel: 'M', fullLabel: 'Monday', mondayOffset: 0 },
  { value: 'TUESDAY', shortLabel: 'T', fullLabel: 'Tuesday', mondayOffset: 1 },
  { value: 'WEDNESDAY', shortLabel: 'W', fullLabel: 'Wednesday', mondayOffset: 2 },
  { value: 'THURSDAY', shortLabel: 'T', fullLabel: 'Thursday', mondayOffset: 3 },
  { value: 'FRIDAY', shortLabel: 'F', fullLabel: 'Friday', mondayOffset: 4 },
  { value: 'SATURDAY', shortLabel: 'S', fullLabel: 'Saturday', mondayOffset: 5 },
  { value: 'SUNDAY', shortLabel: 'S', fullLabel: 'Sunday', mondayOffset: 6 },
] as const;

const WEEKDAY_ORDER = new Map<WeekdayName, number>(
  WEEKDAY_OPTIONS.map((w) => [w.value, w.mondayOffset]),
);

/** Converts Sunday=0..Saturday=6 into Monday=0..Sunday=6 offset. */
export function getMondayBasedOffset(date: Date): number {
  const day = getDay(date);
  return day === 0 ? 6 : day - 1;
}

/** Returns the `WeekdayName` (`'MONDAY'`, etc.) for a local `Date`. */
export function getWeekdayNameFromDate(date: Date): WeekdayName {
  const offset = getMondayBasedOffset(isValid(date) ? date : new Date());
  return WEEKDAY_OPTIONS[offset]?.value ?? 'MONDAY';
}

/** Parses `"MONDAY,WEDNESDAY,FRIDAY"` into sorted `WeekdayName[]`. */
export function parseRecurrenceDays(raw: string | null | undefined): WeekdayName[] {
  if (!raw || raw.trim() === '') return [];
  const validSet = new Set<string>(WEEKDAY_OPTIONS.map((w) => w.value));
  const parsed = raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is WeekdayName => validSet.has(s));
  return Array.from(new Set(parsed)).sort(
    (a, b) => (WEEKDAY_ORDER.get(a) ?? 0) - (WEEKDAY_ORDER.get(b) ?? 0),
  );
}

/** Formats `WeekdayName[]` into `"MONDAY,WEDNESDAY,FRIDAY"` in Mon->Sun order. */
export function serializeRecurrenceDays(days: readonly WeekdayName[]): string {
  const unique = Array.from(new Set(days)).sort(
    (a, b) => (WEEKDAY_ORDER.get(a) ?? 0) - (WEEKDAY_ORDER.get(b) ?? 0),
  );
  return unique.join(',');
}

/**
 * Resolves the `YYYY-MM-DD` date of the specific occurrence that was clicked.
 */
export function getEventOccurrenceDate(event: EventResponseDTO): ApiDate {
  const parsedStart = fromApiDateTime(event.startTime);
  if (isValid(parsedStart)) {
    return toApiDate(parsedStart);
  }
  if (event.occurrenceId) {
    const match = /^\d+_(\d{4}-\d{2}-\d{2})/.exec(event.occurrenceId);
    if (match?.[1]) return match[1];
  }
  return event.startTime.slice(0, 10);
}

/**
 * Generates upcoming occurrence dates (`YYYY-MM-DD`) starting from `event.startTime`
 * covering at least `monthsAhead` months AND at least `minCount` occurrences
 * (bounded by `event.recurrenceEndDate`, `recurrenceInterval`, and `recurrenceDays`).
 */
export function generateUpcomingOccurrenceDates(
  event: EventResponseDTO,
  monthsAhead = 3,
  minCount = 12,
): ApiDate[] {
  const startDate = fromApiDateTime(event.startTime);
  if (!isValid(startDate)) return [];

  const recurrenceType = event.recurrenceType ?? 'NONE';
  const interval =
    event.recurrenceInterval && event.recurrenceInterval > 0
      ? event.recurrenceInterval
      : 1;
  const endLimit =
    event.recurrenceEndDate && event.recurrenceEndDate.trim() !== ''
      ? fromApiDate(event.recurrenceEndDate)
      : null;
  const hasValidEndLimit = endLimit !== null && isValid(endLimit);

  const startDayFloor = startOfDay(startDate);
  const windowEnd = startOfDay(endOfMonth(addMonths(startDate, Math.max(1, monthsAhead) - 1)));
  const dates: ApiDate[] = [];

  const targetWeekdays =
    recurrenceType === 'WEEKLY' ? parseRecurrenceDays(event.recurrenceDays) : [];

  if (recurrenceType === 'WEEKLY' && targetWeekdays.length > 0) {
    const baseMonday = startOfWeek(startDayFloor, { weekStartsOn: 1 });
    for (let k = 0; k < 400; k += 1) {
      const weekMonday = addWeeks(baseMonday, k * interval);
      if (weekMonday.getTime() > windowEnd.getTime() && dates.length >= minCount) {
        break;
      }

      let exceededEndLimit = false;
      for (const wd of targetWeekdays) {
        const offset = WEEKDAY_ORDER.get(wd) ?? 0;
        const candidateDay = startOfDay(addDays(weekMonday, offset));
        if (candidateDay.getTime() < startDayFloor.getTime()) {
          continue;
        }
        if (hasValidEndLimit && endLimit && candidateDay.getTime() > startOfDay(endLimit).getTime()) {
          exceededEndLimit = true;
          break;
        }
        dates.push(toApiDate(candidateDay));
      }
      if (exceededEndLimit) break;
    }
    return dates;
  }

  for (let k = 0; k < 400; k += 1) {
    let candidate: Date;
    switch (recurrenceType) {
      case 'DAILY':
        candidate = addDays(startDate, k * interval);
        break;
      case 'WEEKLY':
        candidate = addWeeks(startDate, k * interval);
        break;
      case 'MONTHLY':
        candidate = addMonths(startDate, k * interval);
        break;
      case 'YEARLY':
        candidate = addYears(startDate, k * interval);
        break;
      default:
        candidate = startDate;
        break;
    }

    const candidateDay = startOfDay(candidate);
    if (hasValidEndLimit && endLimit && candidateDay.getTime() > startOfDay(endLimit).getTime()) {
      break;
    }

    if (candidateDay.getTime() > windowEnd.getTime() && dates.length >= minCount) {
      break;
    }

    dates.push(toApiDate(candidateDay));

    if (recurrenceType === 'NONE') {
      break;
    }
  }

  return dates;
}

/**
 * Builds the `EventScopeRequestDTO` payload for a chosen recurrence scope option.
 */
export function buildScopeRequestDTO(
  choice: ScopeChoice,
  currentOccurrenceDate: ApiDate,
  selectedDates: ApiDate[],
  updateData?: EventRequestDTO | null,
): EventScopeRequestDTO {
  const payloadUpdatePart = updateData ? { updateData } : { updateData: null };

  if (choice === 'THIS_ONLY') {
    return {
      scope: 'SELECTED',
      selectedDates: [currentOccurrenceDate],
      ...payloadUpdatePart,
    };
  }

  if (choice === 'THIS_AND_FOLLOWING') {
    return {
      scope: 'THIS_AND_FOLLOWING',
      fromDate: currentOccurrenceDate,
      ...payloadUpdatePart,
    };
  }

  if (choice === 'ALL') {
    return {
      scope: 'ALL',
      ...payloadUpdatePart,
    };
  }

  return {
    scope: 'SELECTED',
    selectedDates: [...selectedDates].sort(),
    ...payloadUpdatePart,
  };
}
