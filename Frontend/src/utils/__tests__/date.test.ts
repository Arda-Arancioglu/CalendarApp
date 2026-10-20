import { isValid } from 'date-fns';
import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateTime,
  fromApiDate,
  fromApiDateTime,
  fromInputDateTime,
  toApiDate,
  toApiDateTime,
  toInputDateTime,
} from '../date';

describe('date utilities (Spring LocalDateTime <-> local Date)', () => {
  it('formats a local Date as yyyy-MM-ddTHH:mm:ss with NO timezone or Z suffix', () => {
    const localDate = new Date(2026, 9, 20, 14, 30, 5); // Oct 20, 2026, 14:30:05 local
    const formatted = toApiDateTime(localDate);

    expect(formatted).toBe('2026-10-20T14:30:05');
    expect(formatted.endsWith('Z')).toBe(false);
  });

  it('formats a local Date as yyyy-MM-dd', () => {
    const localDate = new Date(2000, 4, 17, 19, 45, 0); // May 17, 2000
    expect(toApiDate(localDate)).toBe('2000-05-17');
  });

  it('round-trips through toApiDateTime and fromApiDateTime preserving local wall-clock fields', () => {
    const original = new Date(2026, 9, 20, 9, 15, 0);
    const wire = toApiDateTime(original);
    const parsed = fromApiDateTime(wire);

    expect(isValid(parsed)).toBe(true);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9);
    expect(parsed.getDate()).toBe(20);
    expect(parsed.getHours()).toBe(9);
    expect(parsed.getMinutes()).toBe(15);
    expect(parsed.getSeconds()).toBe(0);
  });

  it('accepts Jackson variations (omitted seconds and fractional nanoseconds)', () => {
    const withoutSeconds = fromApiDateTime('2026-10-20T14:30');
    expect(isValid(withoutSeconds)).toBe(true);
    expect(withoutSeconds.getHours()).toBe(14);
    expect(withoutSeconds.getMinutes()).toBe(30);
    expect(withoutSeconds.getSeconds()).toBe(0);

    const withNanos = fromApiDateTime('2026-10-20T14:30:12.123456789');
    expect(isValid(withNanos)).toBe(true);
    expect(withNanos.getSeconds()).toBe(12);
    expect(withNanos.getMilliseconds()).toBe(123);
  });

  it('parses date-only strings at local midnight instead of UTC midnight', () => {
    const parsed = fromApiDate('2000-05-17');
    expect(isValid(parsed)).toBe(true);
    expect(parsed.getFullYear()).toBe(2000);
    expect(parsed.getMonth()).toBe(4);
    expect(parsed.getDate()).toBe(17);
    expect(parsed.getHours()).toBe(0);
    expect(parsed.getMinutes()).toBe(0);
  });

  it('rejects UTC Z suffixes, impossible calendar dates, and garbage strings', () => {
    expect(isValid(fromApiDateTime('2026-10-20T14:30:00Z'))).toBe(false);
    expect(isValid(fromApiDateTime('2026-02-31T10:00:00'))).toBe(false);
    expect(isValid(fromApiDateTime('not-a-date'))).toBe(false);
    expect(isValid(fromApiDateTime(''))).toBe(false);
  });

  it('converts to and from <input type="datetime-local"> format', () => {
    const d = new Date(2026, 9, 20, 16, 45, 0);
    const inputStr = toInputDateTime(d);
    expect(inputStr).toBe('2026-10-20T16:45');

    const back = fromInputDateTime(inputStr);
    expect(back.getHours()).toBe(16);
    expect(back.getMinutes()).toBe(45);
  });

  it('formats human-friendly display strings and returns empty string for invalid dates', () => {
    expect(formatDateTime('2026-10-20T14:30:00')).toBe('Oct 20, 2026, 14:30');
    expect(formatDate('2026-10-20')).toBe('Oct 20, 2026');
    expect(formatDateTime('invalid')).toBe('');
    expect(formatDate('invalid')).toBe('');
  });
});
