import { request } from './client';
import type { DateRangeParams } from '../types/api';
import type { EventRequestDTO, EventResponseDTO } from '../types/event';

/**
 * Raw shape returned by the backend's `EventResponseDTO` Java record, which
 * currently sends `taskId` instead of `eventId`. We normalize so `eventId`
 * is always populated (fixing `/api/events/undefined`).
 */
type RawEventDTO = Omit<EventResponseDTO, 'eventId'> & {
  eventId?: number;
  taskId?: number;
  id?: number;
};

function normalizeEvent(raw: RawEventDTO): EventResponseDTO {
  const resolvedId = raw.eventId ?? raw.taskId ?? raw.id ?? 0;
  return {
    ...raw,
    eventId: resolvedId,
    taskId: resolvedId,
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

/** DANGER: deletes ALL of the current user's events. 204 No Content. */
export function deleteAllEvents(): Promise<void> {
  return request<void>('/events', { method: 'DELETE' });
}
