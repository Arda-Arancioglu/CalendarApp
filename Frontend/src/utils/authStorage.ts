import type { UserResponseDTO } from '../types/user';

/**
 * Where we persist the session. We use localStorage so the user stays logged in
 * across tabs and reloads. Trade-off: any script running on the page (XSS) could
 * read the token. See the README "Security notes" section.
 */
const TOKEN_KEY = 'calendar_auth_token';
const USER_KEY = 'calendar_auth_user';

// localStorage can throw (e.g. disabled storage / private mode), so every access is guarded.

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): UserResponseDTO | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    // Validate the shape: localStorage content can be stale or hand-edited.
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'userId' in parsed &&
      'username' in parsed &&
      typeof parsed.userId === 'number' &&
      typeof parsed.username === 'string'
    ) {
      return { userId: parsed.userId, username: parsed.username };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveAuth(token: string, user: UserResponseDTO): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Storage unavailable: the session will just last until the page reloads.
  }
}

export function saveUser(user: UserResponseDTO): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function clearAuth(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}
