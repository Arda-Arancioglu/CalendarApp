import type { DateRangeParams } from '../types/api';
import type { RoutineOccurrencesRangeParams } from '../types/routine';

/**
 * Query-key factories. Every query key in the app comes from here, so
 * invalidating after a mutation is predictable:
 *
 *   queryClient.invalidateQueries({ queryKey: queryKeys.events.all })
 *
 * invalidates EVERY key that starts with ['events'] (all ranges + details).
 * Calendars are keyed by their visible range, so each month/week is cached separately.
 */
export const queryKeys = {
  categories: {
    all: ['categories'] as const,
  },
  events: {
    all: ['events'] as const,
    range: (range: DateRangeParams) => ['events', 'range', range.start, range.end] as const,
    detail: (eventId: number) => ['events', 'detail', eventId] as const,
  },
  routines: {
    all: ['routines'] as const,
    list: () => ['routines', 'list'] as const,
    occurrencesAll: () => ['routines', 'occurrences'] as const,
    occurrences: (range: RoutineOccurrencesRangeParams) =>
      ['routines', 'occurrences', range.fromDate, range.endDate] as const,
  },
  squads: {
    all: ['squads'] as const,
    list: () => ['squads', 'list'] as const,
    detail: (squadId: number) => ['squads', 'detail', squadId] as const,
    /** Prefix for every cached range of one squad's calendar. */
    calendarAll: (squadId: number) => ['squads', 'calendar', squadId] as const,
    calendar: (squadId: number, range: DateRangeParams) =>
      ['squads', 'calendar', squadId, range.start, range.end] as const,
  },
};
