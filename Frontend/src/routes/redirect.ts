const AUTH_PATHS = new Set(['/login', '/register']);

/**
 * Reads `state.from` (set by PrivateRoute) to send the user back where they
 * were going after login. `location.state` is untyped, so we check its shape.
 */
export function getRedirectPath(state: unknown, fallback = '/calendar'): string {
  if (typeof state !== 'object' || state === null || !('from' in state)) return fallback;
  const from: unknown = state.from;
  if (typeof from !== 'object' || from === null || !('pathname' in from)) return fallback;

  const pathname = typeof from.pathname === 'string' ? from.pathname : '';
  const search = 'search' in from && typeof from.search === 'string' ? from.search : '';
  if (!pathname.startsWith('/') || AUTH_PATHS.has(pathname)) return fallback;
  return `${pathname}${search}`;
}
