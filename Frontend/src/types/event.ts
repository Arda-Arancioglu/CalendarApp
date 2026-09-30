export interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  startTime: string; // ISOString e.g. "2026-09-30T10:00:00.000Z"
  endTime: string;   // ISOString e.g. "2026-09-30T11:00:00.000Z"
  creatorId: number;
}

export interface CreateEventPayload {
  title: string;
  description: string;
  startTime: string; // ISOString
  endTime: string;   // ISOString
}
