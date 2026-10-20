import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

/** field name -> first error message for that field */
export type ApiFieldErrors = Record<string, string>;

/**
 * The one error type thrown by `request()` for every failed API call.
 * `status` is the HTTP status, or 0 when the server could not be reached.
 *
 * (Fields are assigned in the constructor body instead of using
 * `constructor(readonly status: number)` because our tsconfig enables
 * `erasableSyntaxOnly`, which forbids TypeScript-only parameter properties.)
 */
export class ApiError extends Error {
  readonly status: number;
  /** Short reason phrase from the server, e.g. "Conflict". */
  readonly error: string | undefined;
  readonly fieldErrors: ApiFieldErrors;

  constructor(
    status: number,
    message: string,
    options: { error?: string; fieldErrors?: ApiFieldErrors } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.error = options.error;
    this.fieldErrors = options.fieldErrors ?? {};
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  /** Worth retrying: the server was unreachable or crashed (not the user's fault). */
  get isRetryable(): boolean {
    return this.isNetworkError || this.isServerError;
  }

  get hasFieldErrors(): boolean {
    return Object.keys(this.fieldErrors).length > 0;
  }
}

const DEFAULT_MESSAGES: Record<number, string> = {
  0: 'Could not reach the server. Check your connection and try again.',
  400: 'The request was invalid. Please check your input.',
  401: 'Your session has expired. Please log in again.',
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: 'This conflicts with existing data.',
};

export function defaultMessageFor(status: number): string {
  return (
    DEFAULT_MESSAGES[status] ??
    (status >= 500 ? 'Something went wrong on the server. Please try again.' : 'Something went wrong.')
  );
}

/** Generic phrases Spring puts in `message` that are useless to show a user. */
const UNHELPFUL_MESSAGES = new Set([
  'No message available',
  'Unauthorized',
  'Forbidden',
  'Bad Request',
  'Not Found',
  'Internal Server Error',
]);

/** Keys that belong to an error envelope (used to detect a bare `{ field: message }` map). */
const ENVELOPE_KEYS = new Set([
  'status',
  'error',
  'message',
  'timestamp',
  'path',
  'errors',
  'fieldErrors',
  'detail',
  'title',
  'type',
  'instance',
  'trace',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/** A field error value can be "msg" or ["msg", "msg2"]. Take the first. */
function firstMessage(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = nonEmptyString(item);
      if (message) return message;
    }
    return undefined;
  }
  return nonEmptyString(value);
}

function readFieldMap(map: Record<string, unknown>, into: ApiFieldErrors): void {
  for (const [field, value] of Object.entries(map)) {
    const message = firstMessage(value);
    if (message && !(field in into)) into[field] = message;
  }
}

/**
 * Collect field errors from every format we might receive:
 *  1. `{ fieldErrors: { username: "..." } }`              (our custom handler)
 *  2. `{ errors: [{ field: "username", defaultMessage }] }` (Spring default)
 *  3. `{ errors: { username: "..." } }`
 *  4. `{ username: "...", password: "..." }`               (bare map, common in tutorials)
 */
function extractFieldErrors(body: Record<string, unknown>): ApiFieldErrors {
  const result: ApiFieldErrors = {};

  if (isRecord(body.fieldErrors)) readFieldMap(body.fieldErrors, result);

  if (Array.isArray(body.errors)) {
    for (const item of body.errors) {
      if (!isRecord(item)) continue;
      const field = nonEmptyString(item.field);
      const message = nonEmptyString(item.defaultMessage) ?? nonEmptyString(item.message);
      if (field && message && !(field in result)) result[field] = message;
    }
  } else if (isRecord(body.errors)) {
    readFieldMap(body.errors, result);
  }

  const keys = Object.keys(body);
  const looksLikeBareMap =
    keys.length > 0 &&
    keys.every((key) => !ENVELOPE_KEYS.has(key)) &&
    Object.values(body).every((value) => typeof value === 'string');
  if (looksLikeBareMap) readFieldMap(body, result);

  return result;
}

/**
 * Turn any failed HTTP response into an `ApiError`. Never throws.
 *
 * Handles: our `{ status, error, message, timestamp }` body, Spring's default
 * error body, validation error lists, empty bodies (Spring Security often sends
 * 401/403 with no body), plain text, and HTML error pages.
 */
export function parseApiError(status: number, rawBody?: string | null): ApiError {
  const text = rawBody?.trim() ?? '';
  if (text === '') return new ApiError(status, defaultMessageFor(status));

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Not JSON: show short plain text as-is, but never dump an HTML page on the user.
    const looksLikeHtml = text.startsWith('<');
    const message = !looksLikeHtml && text.length <= 300 ? text : defaultMessageFor(status);
    return new ApiError(status, message);
  }

  if (typeof parsed === 'string') {
    return new ApiError(status, nonEmptyString(parsed) ?? defaultMessageFor(status));
  }
  if (!isRecord(parsed)) return new ApiError(status, defaultMessageFor(status));

  const fieldErrors = extractFieldErrors(parsed);
  const firstFieldError = Object.values(fieldErrors)[0];
  const error = nonEmptyString(parsed.error) ?? nonEmptyString(parsed.title);

  // Prefer the server's message unless it is a generic phrase, or Spring's
  // "Validation failed for object=..." summary (the field message is clearer).
  const serverMessage = [parsed.message, parsed.detail]
    .map(nonEmptyString)
    .find(
      (message): message is string =>
        message !== undefined &&
        !UNHELPFUL_MESSAGES.has(message) &&
        !(firstFieldError && message.startsWith('Validation failed')),
    );

  const message = serverMessage ?? firstFieldError ?? defaultMessageFor(status);
  return new ApiError(status, message, { error, fieldErrors });
}

/** Best message to show for any caught value. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong.';
}

/**
 * Copy server field errors onto react-hook-form fields.
 * Only fields listed in `fields` are mapped (so a server field name we don't
 * render is not silently swallowed). Returns true if at least one was applied.
 */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  if (!(error instanceof ApiError)) return false;
  let applied = false;
  for (const field of fields) {
    const message = error.fieldErrors[field];
    if (message) {
      setError(field, { type: 'server', message });
      applied = true;
    }
  }
  return applied;
}
