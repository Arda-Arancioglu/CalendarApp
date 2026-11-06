import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as routinesApi from '../api/routines';
import { queryKeys } from './queryKeys';
import type {
  RoutineActivateParams,
  RoutineRequestDTO,
  RoutineShiftRequestDTO,
} from '../types/routine';

/**
 * Fetch all routines for the logged-in user (`GET /api/routines`).
 */
export function useRoutines() {
  return useQuery({
    queryKey: queryKeys.routines.list(),
    queryFn: ({ signal }) => routinesApi.getRoutines(signal),
  });
}

/**
 * Fetch expanded routine occurrences inside `[fromDate, endDate]` (`YYYY-MM-DD`).
 */
export function useRoutineOccurrences(
  fromDate: string | null | undefined,
  endDate: string | null | undefined,
) {
  const hasRange = Boolean(fromDate && endDate);
  return useQuery({
    queryKey:
      fromDate && endDate
        ? queryKeys.routines.occurrences({ fromDate, endDate })
        : ['routines', 'occurrences', 'idle'],
    queryFn: ({ signal }) => {
      if (!fromDate || !endDate) return Promise.resolve([]);
      return routinesApi.getRoutineOccurrences({ fromDate, endDate }, signal);
    },
    enabled: hasRange,
    placeholderData: keepPreviousData,
    meta: { skipErrorToast: true },
  });
}

/**
 * Create a new N-day cycle routine (`POST /api/routines`).
 */
export function useCreateRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: RoutineRequestDTO) => routinesApi.createRoutine(dto),
    meta: { handlesErrorInline: true },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.routines.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.routines.occurrencesAll() });
    },
  });
}

/**
 * Update an existing routine and its cycle items (`PUT /api/routines/{id}`).
 */
export function useUpdateRoutine(options: { handlesErrorInline?: boolean } = {}) {
  const queryClient = useQueryClient();
  const { handlesErrorInline = true } = options;
  return useMutation({
    mutationFn: ({ routineId, dto }: { routineId: number; dto: RoutineRequestDTO }) =>
      routinesApi.updateRoutine(routineId, dto),
    meta: { handlesErrorInline },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.routines.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.routines.occurrencesAll() });
    },
  });
}

/**
 * Surgically shift a routine from a specific date forward (`POST /api/routines/{id}/shift`).
 */
export function useShiftRoutine(options: { handlesErrorInline?: boolean } = {}) {
  const queryClient = useQueryClient();
  const { handlesErrorInline = true } = options;
  return useMutation({
    mutationFn: ({ routineId, dto }: { routineId: number; dto: RoutineShiftRequestDTO }) =>
      routinesApi.shiftRoutine(routineId, dto),
    meta: { handlesErrorInline },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.routines.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.routines.occurrencesAll() });
    },
  });
}

/**
 * Delete a routine permanently (`DELETE /api/routines/{id}`).
 */
export function useDeleteRoutine(options: { handlesErrorInline?: boolean } = {}) {
  const queryClient = useQueryClient();
  const { handlesErrorInline = false } = options;
  return useMutation({
    mutationFn: (routineId: number) => routinesApi.deleteRoutine(routineId),
    meta: { handlesErrorInline },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.routines.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.routines.occurrencesAll() });
    },
  });
}

/**
 * Deactivate (finish / make passive) a routine (`PATCH /api/routines/{id}/deactivate?stopDate=...`).
 */
export function useDeactivateRoutine(options: { handlesErrorInline?: boolean } = {}) {
  const queryClient = useQueryClient();
  const { handlesErrorInline = false } = options;
  return useMutation({
    mutationFn: ({ routineId, stopDate }: { routineId: number; stopDate?: string }) =>
      routinesApi.deactivateRoutine(routineId, stopDate),
    meta: { handlesErrorInline },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.routines.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.routines.occurrencesAll() });
    },
  });
}

/**
 * Re-activate a passive routine from a start date (`PATCH /api/routines/{id}/activate`).
 */
export function useActivateRoutine(options: { handlesErrorInline?: boolean } = {}) {
  const queryClient = useQueryClient();
  const { handlesErrorInline = false } = options;
  return useMutation({
    mutationFn: ({
      routineId,
      params,
    }: {
      routineId: number;
      params?: RoutineActivateParams;
    }) => routinesApi.activateRoutine(routineId, params),
    meta: { handlesErrorInline },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.routines.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.routines.occurrencesAll() });
    },
  });
}
