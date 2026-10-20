import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as squadsApi from '../api/squads';
import { queryKeys } from './queryKeys';
import type { DateRangeParams } from '../types/api';

/**
 * Fetch the combined squad calendar for the visible date range
 * (`GET /api/squad/{id}/calendar?start=...&end=...`).
 */
export function useSquadCalendar(squadId: number | null, range: DateRangeParams | null) {
  return useQuery({
    queryKey:
      squadId !== null && range
        ? queryKeys.squads.calendar(squadId, range)
        : ['squads', 'calendar', 'idle'],
    queryFn: ({ signal }) => {
      if (squadId === null || !range) return Promise.resolve([]);
      return squadsApi.getSquadCalendar(squadId, range, signal);
    },
    enabled: squadId !== null && range !== null,
    placeholderData: keepPreviousData,
    meta: { skipErrorToast: true },
  });
}
