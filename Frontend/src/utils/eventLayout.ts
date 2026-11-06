import type { EventContentArg } from '@fullcalendar/core';

/**
 * Calculates event duration in minutes from FullCalendar's start and end dates.
 * Defaults to 60 minutes if end date is unspecified.
 */
export function calculateEventDurationInMinutes(arg: EventContentArg): number {
  if (arg.event.start && arg.event.end) {
    return Math.round((arg.event.end.getTime() - arg.event.start.getTime()) / 60000);
  }
  return 60;
}

/**
 * Returns true if the event duration is 45 minutes or less (e.g. 15, 30, or 45-min slots).
 */
export function isShortEvent(arg: EventContentArg): boolean {
  return calculateEventDurationInMinutes(arg) <= 45;
}
