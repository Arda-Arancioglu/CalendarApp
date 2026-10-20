import { describe, expect, it } from 'vitest';
import { computeFreeTimeSlots } from '../freeTime';

describe('computeFreeTimeSlots (08:00-22:00 window, >=30m duration)', () => {
  it('returns the full 08:00-22:00 window (840 mins) when there are no busy intervals', () => {
    const rangeStart = new Date(2026, 9, 20, 0, 0, 0);
    const rangeEnd = new Date(2026, 9, 21, 0, 0, 0);

    const slots = computeFreeTimeSlots(rangeStart, rangeEnd, []);
    expect(slots).toHaveLength(1);
    expect(slots[0]?.start).toEqual(new Date(2026, 9, 20, 8, 0, 0));
    expect(slots[0]?.end).toEqual(new Date(2026, 9, 20, 22, 0, 0));
    expect(slots[0]?.durationMinutes).toBe(840);
  });

  it('merges overlapping busy blocks and ignores gaps shorter than 30 minutes', () => {
    const rangeStart = new Date(2026, 9, 20, 0, 0, 0);
    const rangeEnd = new Date(2026, 9, 21, 0, 0, 0);

    const busy = [
      // 08:00 to 08:20 leaves no gap before 08:00, and 08:20 -> 08:40 is only 20 mins (< 30m)
      { start: new Date(2026, 9, 20, 8, 0), end: new Date(2026, 9, 20, 8, 20) },
      // Overlapping block 08:40 -> 11:00 and 10:30 -> 12:00 (merges to 08:40 -> 12:00)
      { start: new Date(2026, 9, 20, 8, 40), end: new Date(2026, 9, 20, 11, 0) },
      { start: new Date(2026, 9, 20, 10, 30), end: new Date(2026, 9, 20, 12, 0) },
      // Afternoon block 14:00 -> 23:00 (clipped at 22:00)
      { start: new Date(2026, 9, 20, 14, 0), end: new Date(2026, 9, 20, 23, 0) },
    ];

    const slots = computeFreeTimeSlots(rangeStart, rangeEnd, busy);
    expect(slots).toHaveLength(1);
    expect(slots[0]?.start).toEqual(new Date(2026, 9, 20, 12, 0));
    expect(slots[0]?.end).toEqual(new Date(2026, 9, 20, 14, 0));
    expect(slots[0]?.durationMinutes).toBe(120);
  });
});
