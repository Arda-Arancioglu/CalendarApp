/**
 * Minimal JWT decoding, used only to read the `exp` (expiry) claim so we can
 * log the user out right when the token dies instead of waiting for a 401.
 *
 * We do NOT verify the signature (that needs the server's secret). That's fine:
 * the server verifies every request; this is purely a UX convenience.
 */

export interface JwtPayload {
  sub?: string;
  /** Expiry as seconds since the Unix epoch. */
  exp?: number;
  /** Issued-at as seconds since the Unix epoch. */
  iat?: number;
  [claim: string]: unknown;
}

/** base64url (used by JWTs) -> UTF-8 string */
function decodeBase64Url(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  // atob gives one char per byte; TextDecoder turns the bytes back into proper UTF-8.
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Returns the token's payload, or null if it is not a readable JWT. */
export function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const payload: unknown = JSON.parse(decodeBase64Url(parts[1]));
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

/** Expiry as a Date, or null if the token has no usable `exp`. */
export function getTokenExpiry(token: string): Date | null {
  const exp = decodeJwt(token)?.exp;
  return typeof exp === 'number' && Number.isFinite(exp) ? new Date(exp * 1000) : null;
}

/**
 * True when the token is expired (or not a valid JWT at all).
 * A token without `exp` is treated as not expired: the server decides.
 */
export function isTokenExpired(token: string, now: number = Date.now()): boolean {
  if (decodeJwt(token) === null) return true;
  const expiry = getTokenExpiry(token);
  return expiry !== null && now >= expiry.getTime();
}
