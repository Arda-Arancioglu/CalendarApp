import type { ApiDate, ApiDateTime } from './api';
import type { CategoryResponseDTO } from './category';

export type RecurrenceType = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type RecurrenceScope = 'ALL' | 'SELECTED' | 'THIS_AND_FOLLOWING';

/**
 * Response of the /api/events endpoints.
 * Note: The backend Java record `EventResponseDTO` currently names the ID field
 * `taskId` (while the spec calls it `eventId`). Our API layer normalizes both
 * so `eventId` is always a valid number.
 */
export interface EventResponseDTO {
  eventId: number;
  taskId?: number;
  occurrenceId?: string;
  title: string;
  description: string | null;
  startTime: ApiDateTime;
  endTime: ApiDateTime;
  isFlexible: boolean;
  categories: CategoryResponseDTO[];
  isPrivate: boolean;
  recurrenceType?: RecurrenceType;
  recurrenceEndDate?: ApiDate | null;
}

/** Body of POST /api/events and PUT /api/events/{id} (PUT always sends the full body). */
export interface EventRequestDTO {
  title: string;
  description?: string;
  startTime: ApiDateTime;
  endTime: ApiDateTime;
  isFlexible?: boolean;
  categoryIds: number[];
  isPrivate: boolean;
  recurrenceType?: RecurrenceType;
  recurrenceEndDate?: ApiDate | null;
}

/** Body of DELETE /api/events/{id}/scope and PUT /api/events/{id}/scope. */
export interface EventScopeRequestDTO {
  scope: RecurrenceScope;
  selectedDates?: ApiDate[]; // e.g. ["2026-10-26", "2026-11-04"] for 'SELECTED'
  fromDate?: ApiDate; // e.g. "2026-10-26" for 'THIS_AND_FOLLOWING'
  updateData?: EventRequestDTO | null; // Full event body when editing; null/undefined when deleting
}
