import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as eventsApi from '../api/events';
import { queryKeys } from './queryKeys';
import type { DateRangeParams } from '../types/api';
import type { EventRequestDTO } from '../types/event';

/**
 * Fetch events inside the calendar's visible range (`?start=...&end=...`).
 *
 * Uses `keepPreviousData` so switching month/week/day doesn't flash an empty
 * calendar while the next range is loading.
 */
export function useEventsInRange(range: DateRangeParams | null) {
  return useQuery({
    queryKey: range ? queryKeys.events.range(range) : ['events', 'range', 'idle'],
    queryFn: ({ signal }) => {
      if (!range) return Promise.resolve([]);
      return eventsApi.getEvents(range, signal);
    },
    enabled: range !== null,
    placeholderData: keepPreviousData,
    meta: { skipErrorToast: true },
  });
}

/**
 * Fetch a single event by id (`GET /api/events/{id}`).
 */
export function useEvent(eventId: number | null) {
  return useQuery({
    queryKey: eventId !== null ? queryKeys.events.detail(eventId) : ['events', 'detail', 'none'],
    queryFn: ({ signal }) => {
      if (eventId === null) throw new Error('eventId is required');
      return eventsApi.getEvent(eventId, signal);
    },
    enabled: eventId !== null,
  });
}

/**
 * Create an event (`POST /api/events`).
 * Invalidates personal events and any cached squad calendars (since my new
 * event affects my squad availability too).
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: EventRequestDTO) => eventsApi.createEvent(body),
    meta: { handlesErrorInline: true },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.squads.all });
    },
  });
}

/**
 * Update an event (`PUT /api/events/{id}`, always sending the full body).
 * `handlesErrorInline` can be overridden when used for drag-to-reschedule.
 */
export function useUpdateEvent(options: { handlesErrorInline?: boolean } = {}) {
  const queryClient = useQueryClient();
  const { handlesErrorInline = true } = options;
  return useMutation({
    mutationFn: ({ eventId, body }: { eventId: number; body: EventRequestDTO }) =>
      eventsApi.updateEvent(eventId, body),
    meta: { handlesErrorInline },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.squads.all });
    },
  });
}

/**
 * Delete a single event (`DELETE /api/events/{id}`).
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: number) => eventsApi.deleteEvent(eventId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.squads.all });
    },
  });
}
