import { request } from './client';
import type { DateRangeParams } from '../types/api';
import type { EventRequestDTO, EventResponseDTO } from '../types/event';

/**
 * Events in a date range. Always call this with the calendar's visible range
 * (formatted with `toApiDateTime`) instead of loading every event.
 */
export function getEvents(range: DateRangeParams, signal?: AbortSignal): Promise<EventResponseDTO[]> {
  return request<EventResponseDTO[]>('/events', {
    query: { start: range.start, end: range.end },
    signal,
  });
}

export function getEvent(eventId: number, signal?: AbortSignal): Promise<EventResponseDTO> {
  return request<EventResponseDTO>(`/events/${eventId}`, { signal });
}

export function createEvent(body: EventRequestDTO): Promise<EventResponseDTO> {
  return request<EventResponseDTO>('/events', { method: 'POST', body });
}

/** PUT replaces the event, so always send the FULL body. */
export function updateEvent(eventId: number, body: EventRequestDTO): Promise<EventResponseDTO> {
  return request<EventResponseDTO>(`/events/${eventId}`, { method: 'PUT', body });
}

/** Returns the deleted event (200). */
export function deleteEvent(eventId: number): Promise<EventResponseDTO> {
  return request<EventResponseDTO>(`/events/${eventId}`, { method: 'DELETE' });
}

/** DANGER: deletes ALL of the current user's events. 204 No Content. */
export function deleteAllEvents(): Promise<void> {
  return request<void>('/events', { method: 'DELETE' });
}
