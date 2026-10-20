import { format, isValid } from 'date-fns';
import type { ApiDate, ApiDateTime } from '../types/api';

/**
 * Date helpers for talking to the Spring backend.
 *
 * The backend uses `LocalDateTime` = a date + time with NO timezone.
 * So we must send exactly what the user sees on their wall clock:
 *   "2026-10-20T14:30:00"
 *
 * NEVER use `date.toISOString()` for this: it converts to UTC and appends "Z",
 * so 14:30 in Istanbul (UTC+3) would be saved as 11:30.
 */

export const API_DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss";
export const API_DATE_FORMAT = 'yyyy-MM-dd';
/** Format used by <input type="datetime-local"> */
export const INPUT_DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm";

/** Local Date -> "2026-10-20T14:30:00" */
export function toApiDateTime(date: Date): ApiDateTime {
  return format(date, API_DATE_TIME_FORMAT);
}

/** Local Date -> "2026-10-20" */
export function toApiDate(date: Date): ApiDate {
  return format(date, API_DATE_FORMAT);
}

/**
 * Matches "yyyy-MM-dd", "yyyy-MM-ddTHH:mm", "yyyy-MM-ddTHH:mm:ss" and
 * "yyyy-MM-ddTHH:mm:ss.SSS...". Jackson omits ":00" seconds and may add
 * fractions, so we accept all of them. A trailing "Z" or offset is NOT accepted
 * on purpose: LocalDateTime values never have one.
 */
const LOCAL_DATE_TIME_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?)?$/;

/**
 * "2026-10-20T14:30:00" -> Date at 14:30 LOCAL time.
 *
 * We parse the parts by hand because `new Date("2026-10-20")` (date only)
 * is treated as UTC by JavaScript, which shifts the day for some users.
 * Returns an Invalid Date (check with `isValid`) when the string is malformed.
 */
export function fromApiDateTime(value: string): Date {
  const match = LOCAL_DATE_TIME_REGEX.exec(value.trim());
  if (!match) return new Date(Number.NaN);

  const [, y, mo, d, h = '0', mi = '0', s = '0', fraction = '0'] = match;
  const milliseconds = Number(fraction.padEnd(3, '0').slice(0, 3));
  const date = new Date(
    Number(y),
    Number(mo) - 1, // JS months are 0-based
    Number(d),
    Number(h),
    Number(mi),
    Number(s),
    milliseconds,
  );

  // Reject impossible dates like 2026-02-31 (JS would roll them over to March).
  if (date.getMonth() !== Number(mo) - 1 || date.getDate() !== Number(d)) {
    return new Date(Number.NaN);
  }
  return date;
}

/** "2000-05-17" -> Date at local midnight. */
export function fromApiDate(value: string): Date {
  return fromApiDateTime(value);
}

/** Date -> value for <input type="datetime-local"> */
export function toInputDateTime(date: Date): string {
  return format(date, INPUT_DATE_TIME_FORMAT);
}

/** Value of <input type="datetime-local"> ("2026-10-20T14:30") -> local Date */
export function fromInputDateTime(value: string): Date {
  return fromApiDateTime(value);
}

/** Human-friendly display, e.g. "Oct 20, 2026, 14:30". Returns "" for invalid input. */
export function formatDateTime(value: Date | string): string {
  const date = typeof value === 'string' ? fromApiDateTime(value) : value;
  return isValid(date) ? format(date, 'MMM d, yyyy, HH:mm') : '';
}

/** Human-friendly date only, e.g. "Oct 20, 2026". Returns "" for invalid input. */
export function formatDate(value: Date | string): string {
  const date = typeof value === 'string' ? fromApiDateTime(value) : value;
  return isValid(date) ? format(date, 'MMM d, yyyy') : '';
}
