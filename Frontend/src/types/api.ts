/**
 * Shared API-level types.
 *
 * The backend uses Java `LocalDateTime` (no timezone), e.g. "2026-10-20T14:30:00".
 * We keep those values as plain strings in DTOs and convert with
 * `toApiDateTime` / `fromApiDateTime` from `utils/date.ts`.
 */
export type ApiDateTime = string;

/** Java `LocalDate`, e.g. "2000-05-17". */
export type ApiDate = string;

/** The backend's custom error body. Fields are optional because Spring's
 *  default error bodies (and empty 401/403 bodies) look different. */
export interface ApiErrorBody {
  status?: number;
  error?: string;
  message?: string;
  timestamp?: string;
  fieldErrors?: Record<string, string>;
}

/** Visible range of a calendar, already formatted for the API. */
export interface DateRangeParams {
  start: ApiDateTime;
  end: ApiDateTime;
}
