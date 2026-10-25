import { request } from './client';
import type { DateRangeParams } from '../types/api';
import type {
  EventRequestDTO,
  EventResponseDTO,
  EventScopeRequestDTO,
} from '../types/event';

/**
 * Raw shape returned by the backend's `EventResponseDTO` Java record, which
 * currently sends `taskId` instead of `eventId`. We normalize so `eventId`
 * and `occurrenceId` are always populated.
 */
type RawEventDTO = Omit<EventResponseDTO, 'eventId'> & {
  eventId?: number;
  taskId?: number;
  id?: number;
  occurrenceId?: string;
  occurenceId?: string;
};

function normalizeEvent(raw: RawEventDTO): EventResponseDTO {
  const resolvedId = raw.eventId ?? raw.taskId ?? raw.id ?? 0;
  const resolvedOccurrenceId = raw.occurrenceId ?? raw.occurenceId;
  return {
    ...raw,
    eventId: resolvedId,
    taskId: resolvedId,
    ...(resolvedOccurrenceId !== undefined ? { occurrenceId: resolvedOccurrenceId } : {}),
    categories: Array.isArray(raw.categories) ? raw.categories : [],
  };
}

/**
 * Events in a date range. Always call this with the calendar's visible range
 * (formatted with `toApiDateTime`) instead of loading every event.
 */
export async function getEvents(
  range: DateRangeParams,
  signal?: AbortSignal,
): Promise<EventResponseDTO[]> {
  const list = await request<RawEventDTO[]>('/events', {
    query: { start: range.start, end: range.end },
    signal,
  });
  return list.map(normalizeEvent);
}

export async function getEvent(eventId: number, signal?: AbortSignal): Promise<EventResponseDTO> {
  const raw = await request<RawEventDTO>(`/events/${eventId}`, { signal });
  return normalizeEvent(raw);
}

export async function createEvent(body: EventRequestDTO): Promise<EventResponseDTO> {
  const raw = await request<RawEventDTO>('/events', { method: 'POST', body });
  return normalizeEvent(raw);
}

/** PUT replaces the event, so always send the FULL body. */
export async function updateEvent(
  eventId: number,
  body: EventRequestDTO,
): Promise<EventResponseDTO> {
  const raw = await request<RawEventDTO>(`/events/${eventId}`, { method: 'PUT', body });
  return normalizeEvent(raw);
}

/** Returns the deleted event (200). */
export async function deleteEvent(eventId: number): Promise<EventResponseDTO> {
  const raw = await request<RawEventDTO>(`/events/${eventId}`, { method: 'DELETE' });
  return normalizeEvent(raw);
}

/** Scoped delete for recurring events (`DELETE /api/events/{id}/scope`). */
export async function deleteEventWithScope(
  eventId: number,
  body: EventScopeRequestDTO,
): Promise<void> {
  await request<void>(`/events/${eventId}/scope`, {
    method: 'DELETE',
    body,
  });
}

/** Scoped update for recurring events (`PUT /api/events/{id}/scope`). */
export async function updateEventWithScope(
  eventId: number,
  body: EventScopeRequestDTO,
): Promise<void> {
  await request<void>(`/events/${eventId}/scope`, {
    method: 'PUT',
    body,
  });
}
