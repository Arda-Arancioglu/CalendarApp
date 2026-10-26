import { ApiError, parseApiError } from '../utils/errors';
import { getStoredToken } from '../utils/authStorage';

/**
 * The single place where the app talks HTTP.
 *
 * - Adds `Authorization: Bearer <token>` (unless `auth: false`)
 * - Sends JSON bodies for ANY method, including DELETE (the kick endpoint needs it)
 * - Returns `undefined` for 204 / empty responses (never calls .json() on them)
 * - Throws a typed `ApiError` for non-2xx responses and network failures
 * - Calls the registered "unauthorized" handler on 401 (except for auth calls)
 */

/** Accepts "http://localhost:8080", "http://localhost:8080/" or ".../api". */
export function resolveApiBaseUrl(raw: string | undefined): string {
  const host = (raw && raw.trim() !== '' ? raw.trim() : 'http://localhost:8080')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');
  return `${host}/api`;
}

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_URL);

// ---- 401 handling ----
// AuthProvider registers a function here. We use this "callback registry"
// instead of importing the context because this file is plain TypeScript,
// not a React component, so it can't use hooks.
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

// ---- request() ----

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type QueryParams = Record<string, string | number | boolean | undefined>;

export interface RequestOptions {
  method?: HttpMethod;
  /** Will be JSON-encoded. */
  body?: unknown;
  query?: QueryParams;
  /**
   * Set to false for login/register: no token is sent, and a 401 there means
   * "wrong password", not "session expired", so the global logout must NOT run.
   */
  auth?: boolean;
  /** Lets TanStack Query cancel requests that are no longer needed. */
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: QueryParams): string {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.append(key, String(value));
  }
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * Perform an API call and return the parsed JSON as `T`.
 * Use `request<void>` for endpoints that return 204 No Content.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, signal } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    // A cancelled request must stay an AbortError so TanStack Query ignores it.
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    // fetch only rejects for network problems (server down, CORS blocked, offline).
    throw new ApiError(0, parseApiError(0).message);
  }

  // Read as text first: this works for JSON, plain text AND empty bodies,
  // whereas response.json() would crash on a 204 or an empty 401.
  const text = await response.text();

  if (!response.ok) {
    const error = parseApiError(response.status, text);
    if (response.status === 401 && auth) onUnauthorized?.();
    throw error;
  }

  if (response.status === 204 || text.trim() === '') {
    // The caller asked for T, but there is no body. Callers of 204 endpoints
    // use request<void>, so `undefined` is the correct value for them.
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(response.status, 'The server sent a response we could not read.');
  }
}
