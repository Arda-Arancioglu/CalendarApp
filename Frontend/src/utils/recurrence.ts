import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  getDay,
  isValid,
  startOfDay,
} from 'date-fns';
import { fromApiDate, fromApiDateTime, toApiDate } from './date';
import type { ApiDate } from '../types/api';
import type {
  EventRequestDTO,
  EventResponseDTO,
  EventScopeRequestDTO,
} from '../types/event';

export type ScopeChoice = 'THIS_ONLY' | 'THIS_AND_FOLLOWING' | 'ALL' | 'CUSTOM';

export const QUICK_SELECT_COUNTS = [2, 4, 8, 12] as const;
export const WEEKDAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;

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
 * (bounded by `event.recurrenceEndDate` when set).
 */
export function generateUpcomingOccurrenceDates(
  event: EventResponseDTO,
  monthsAhead = 3,
  minCount = 12,
): ApiDate[] {
  const startDate = fromApiDateTime(event.startTime);
  if (!isValid(startDate)) return [];

  const recurrenceType = event.recurrenceType ?? 'NONE';
  const endLimit =
    event.recurrenceEndDate && event.recurrenceEndDate.trim() !== ''
      ? fromApiDate(event.recurrenceEndDate)
      : null;
  const hasValidEndLimit = endLimit !== null && isValid(endLimit);

  const windowEnd = startOfDay(endOfMonth(addMonths(startDate, Math.max(1, monthsAhead) - 1)));
  const dates: ApiDate[] = [];

  for (let k = 0; k < 400; k += 1) {
    let candidate: Date;
    switch (recurrenceType) {
      case 'DAILY':
        candidate = addDays(startDate, k);
        break;
      case 'WEEKLY':
        candidate = addWeeks(startDate, k);
        break;
      case 'MONTHLY':
        candidate = addMonths(startDate, k);
        break;
      case 'YEARLY':
        candidate = addYears(startDate, k);
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

/** Converts Sunday=0..Saturday=6 into Monday=0..Sunday=6 offset. */
export function getMondayBasedOffset(date: Date): number {
  const day = getDay(date);
  return day === 0 ? 6 : day - 1;
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
