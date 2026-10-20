import { describe, expect, it, vi } from 'vitest';
import { ApiError, applyFieldErrors, getErrorMessage, parseApiError } from '../errors';

describe('parseApiError & error helpers', () => {
  it('parses the custom backend error envelope { status, error, message, timestamp }', () => {
    const body = JSON.stringify({
      status: 409,
      error: 'Conflict',
      message: 'Username is already taken',
      timestamp: '2026-10-20T14:30:00',
    });

    const err = parseApiError(409, body);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
    expect(err.error).toBe('Conflict');
    expect(err.message).toBe('Username is already taken');
    expect(err.isRetryable).toBe(false);
  });

  it('extracts field errors from { fieldErrors: { ... } }', () => {
    const body = JSON.stringify({
      status: 400,
      error: 'Bad Request',
      message: 'Validation failed for object',
      fieldErrors: {
        username: 'Must be at least 3 characters',
        email: 'Invalid email address',
      },
    });

    const err = parseApiError(400, body);
    expect(err.hasFieldErrors).toBe(true);
    expect(err.fieldErrors).toEqual({
      username: 'Must be at least 3 characters',
      email: 'Invalid email address',
    });
    // Replaces generic "Validation failed..." summary with the first clear field error
    expect(err.message).toBe('Must be at least 3 characters');
  });

  it('extracts field errors from Spring default MethodArgumentNotValidException array', () => {
    const body = JSON.stringify({
      status: 400,
      error: 'Bad Request',
      message: 'Validation failed for object="registerRequestDTO"',
      errors: [
        { field: 'password', defaultMessage: 'size must be between 6 and 40' },
      ],
    });

    const err = parseApiError(400, body);
    expect(err.fieldErrors).toEqual({
      password: 'size must be between 6 and 40',
    });
    expect(err.message).toBe('size must be between 6 and 40');
  });

  it('extracts field errors from a bare { field: message } map', () => {
    const body = JSON.stringify({
      title: 'Title is required',
      endTime: 'End time must be after start time',
    });

    const err = parseApiError(400, body);
    expect(err.fieldErrors).toEqual({
      title: 'Title is required',
      endTime: 'End time must be after start time',
    });
  });

  it('returns friendly defaults when Spring Security sends an empty 401 or 403 body', () => {
    const err401 = parseApiError(401, '');
    expect(err401.status).toBe(401);
    expect(err401.message).toBe('Your session has expired. Please log in again.');

    const err403 = parseApiError(403, null);
    expect(err403.status).toBe(403);
    expect(err403.message).toBe("You don't have permission to do that.");
  });

  it('preserves short plain-text error messages and hides raw HTML error pages', () => {
    const plainErr = parseApiError(400, 'Squad invite code does not exist');
    expect(plainErr.message).toBe('Squad invite code does not exist');

    const htmlErr = parseApiError(502, '<html><body><h1>502 Bad Gateway</h1></body></html>');
    expect(htmlErr.message).toBe('Something went wrong on the server. Please try again.');
    expect(htmlErr.isServerError).toBe(true);
    expect(htmlErr.isRetryable).toBe(true);
  });

  it('applies matching server field errors to react-hook-form setError', () => {
    const err = new ApiError(400, 'Invalid input', {
      fieldErrors: { username: 'Already exists', unknownField: 'Ignored' },
    });
    const setError = vi.fn();

    const applied = applyFieldErrors<{ username: string; password: string }>(
      err,
      setError,
      ['username', 'password'],
    );

    expect(applied).toBe(true);
    expect(setError).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenCalledWith('username', {
      type: 'server',
      message: 'Already exists',
    });
    expect(getErrorMessage(err)).toBe('Invalid input');
  });
});
