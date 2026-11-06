import type { EventContentArg } from '@fullcalendar/core';
import { describe, expect, it } from 'vitest';
import { calculateEventDurationInMinutes, isShortEvent } from '../eventLayout';

function makeMockArg(start?: Date, end?: Date): EventContentArg {
  return {
    event: {
      id: '1',
      title: 'Test Event',
      start: start ?? null,
      end: end ?? null,
      extendedProps: {},
    },
    timeText: '10:00 - 10:30',
    view: {
      type: 'timeGridWeek',
    },
  } as unknown as EventContentArg;
}

describe('eventLayout utils', () => {
  it('calculates duration in minutes accurately', () => {
    const start = new Date(2026, 10, 6, 10, 0);
    const end30 = new Date(2026, 10, 6, 10, 30);
    const end45 = new Date(2026, 10, 6, 10, 45);
    const end60 = new Date(2026, 10, 6, 11, 0);

    expect(calculateEventDurationInMinutes(makeMockArg(start, end30))).toBe(30);
    expect(calculateEventDurationInMinutes(makeMockArg(start, end45))).toBe(45);
    expect(calculateEventDurationInMinutes(makeMockArg(start, end60))).toBe(60);
  });

  it('defaults to 60 minutes when end is missing', () => {
    const start = new Date(2026, 10, 6, 10, 0);
    expect(calculateEventDurationInMinutes(makeMockArg(start, undefined))).toBe(60);
  });

  it('correctly identifies short events (<= 45 minutes)', () => {
    const start = new Date(2026, 10, 6, 10, 0);
    const end15 = new Date(2026, 10, 6, 10, 15);
    const end30 = new Date(2026, 10, 6, 10, 30);
    const end45 = new Date(2026, 10, 6, 10, 45);
    const end50 = new Date(2026, 10, 6, 10, 50);
    const end60 = new Date(2026, 10, 6, 11, 0);

    expect(isShortEvent(makeMockArg(start, end15))).toBe(true);
    expect(isShortEvent(makeMockArg(start, end30))).toBe(true);
    expect(isShortEvent(makeMockArg(start, end45))).toBe(true);
    expect(isShortEvent(makeMockArg(start, end50))).toBe(false);
    expect(isShortEvent(makeMockArg(start, end60))).toBe(false);
  });
});
