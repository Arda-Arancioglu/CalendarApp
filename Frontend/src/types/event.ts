import type { ApiDateTime } from './api';
import type { CategoryResponseDTO } from './category';

/** Response of the /api/events endpoints. */
export interface EventResponseDTO {
  eventId: number;
  title: string;
  description: string | null;
  startTime: ApiDateTime;
  endTime: ApiDateTime;
  isFlexible: boolean;
  categories: CategoryResponseDTO[];
  isPrivate: boolean;
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
}
