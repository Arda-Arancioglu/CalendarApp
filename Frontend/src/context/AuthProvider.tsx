import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext';
import * as authApi from '../api/auth';
import { getMe } from '../api/user';
import { setUnauthorizedHandler } from '../api/client';
import { clearAuth, getStoredToken, getStoredUser, saveAuth, saveUser } from '../utils/authStorage';
import { getTokenExpiry, isTokenExpired } from '../utils/jwt';
import { ApiError } from '../utils/errors';
import type { AuthResponseDTO, LoginRequestDTO, RegisterRequestDTO } from '../types/auth';
import type { UserResponseDTO } from '../types/user';

export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please log in again.';

/** Browsers cap setTimeout at ~24.8 days; longer delays fire immediately. */
const MAX_TIMEOUT_MS = 2_147_483_647;

interface SessionState {
  status: AuthStatus;
  token: string | null;
  user: UserResponseDTO | null;
}

const LOGGED_OUT: SessionState = { status: 'anonymous', token: null, user: null };

/** Decide the starting state from localStorage, before the first render. */
function readInitialSession(): { session: SessionState; notice: string | null } {
  const token = getStoredToken();
  const user = getStoredUser();

  if (!token || !user) {
    clearAuth(); // remove half-saved leftovers
    return { session: LOGGED_OUT, notice: null };
  }
  if (isTokenExpired(token)) {
    clearAuth();
    return { session: LOGGED_OUT, notice: SESSION_EXPIRED_MESSAGE };
  }
  // Looks valid locally; confirm with the server (see effect below).
  return { session: { status: 'checking', token, user }, notice: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [initial] = useState(readInitialSession);
  const [session, setSession] = useState<SessionState>(initial.session);
  const [notice, setNotice] = useState<string | null>(initial.notice);

  /** Log out locally. `expired` shows the "session expired" message on the login page. */
  const endSession = useCallback(
    (reason: 'manual' | 'expired') => {
      clearAuth();
      // Drop all cached server data so the next user never sees the previous user's events.
      queryClient.clear();
      setSession(LOGGED_OUT);
      setNotice(reason === 'expired' ? SESSION_EXPIRED_MESSAGE : null);
    },
    [queryClient],
  );

  // 1) Any 401 from an authenticated API call ends the session.
  useEffect(() => {
    setUnauthorizedHandler(() => endSession('expired'));
    return () => setUnauthorizedHandler(null);
  }, [endSession]);

  // 2) On start, validate the stored token with GET /user/me.
  useEffect(() => {
    if (session.status !== 'checking') return;
    const controller = new AbortController();

    getMe(controller.signal)
      .then((me) => {
        saveUser(me);
        setSession((current) =>
          current.token ? { status: 'authenticated', token: current.token, user: me } : current,
        );
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) return; // handled by (1)
        if (error instanceof ApiError && error.status === 403) {
          // Spring Security often answers 403 (not 401) for a bad/old token
          // when no custom entry point is configured. Treat it as expired.
          endSession('expired');
          return;
        }
        // Server unreachable or crashed: keep the stored session. Pages will
        // show their own error states with retry once the server is back.
        setSession((current) => (current.token ? { ...current, status: 'authenticated' } : current));
      });

    // React StrictMode runs effects twice in dev; aborting avoids a duplicate request.
    return () => controller.abort();
  }, [session.status, endSession]);

  // 3) Proactive logout exactly when the JWT expires (there is no refresh endpoint).
  useEffect(() => {
    const token = session.token;
    if (!token) return;
    const expiry = getTokenExpiry(token);
    if (!expiry) return;

    const checkExpiry = () => {
      if (isTokenExpired(token)) endSession('expired');
    };
    const delay = Math.min(Math.max(expiry.getTime() - Date.now(), 0), MAX_TIMEOUT_MS);
    const timerId = window.setTimeout(checkExpiry, delay);

    // Timers are paused while a laptop sleeps, so also check when the tab becomes visible again.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkExpiry();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearTimeout(timerId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [session.token, endSession]);

  const startSession = useCallback((response: AuthResponseDTO) => {
    const user: UserResponseDTO = { userId: response.userId, username: response.username };
    saveAuth(response.token, user);
    setSession({ status: 'authenticated', token: response.token, user });
    setNotice(null);
  }, []);

  const login = useCallback(
    async (body: LoginRequestDTO) => {
      startSession(await authApi.login(body));
    },
    [startSession],
  );

  const register = useCallback(
    async (body: RegisterRequestDTO) => {
      startSession(await authApi.register(body));
    },
    [startSession],
  );

  const logout = useCallback(() => endSession('manual'), [endSession]);
  const clearNotice = useCallback(() => setNotice(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: session.status,
      user: session.user,
      isAuthenticated: session.status === 'authenticated',
      notice,
      clearNotice,
      login,
      register,
      logout,
    }),
    [session.status, session.user, notice, clearNotice, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
