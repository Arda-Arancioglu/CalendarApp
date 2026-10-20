import { describe, expect, it } from 'vitest';
import { decodeJwt, getTokenExpiry, isTokenExpired } from '../jwt';

function createFakeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

describe('JWT client utilities', () => {
  it('decodes payload claims from a standard 3-part JWT', () => {
    const token = createFakeJwt({ sub: 'arda', exp: 1_900_000_000 });
    const decoded = decodeJwt(token);

    expect(decoded).toEqual({ sub: 'arda', exp: 1_900_000_000 });
    expect(getTokenExpiry(token)?.getTime()).toBe(1_900_000_000 * 1000);
  });

  it('detects expired vs active tokens relative to a reference timestamp', () => {
    const expSeconds = 1_800_000_000;
    const token = createFakeJwt({ sub: 'arda', exp: expSeconds });

    // 10 seconds before expiry -> not expired
    expect(isTokenExpired(token, (expSeconds - 10) * 1000)).toBe(false);
    // Exact expiry instant -> expired
    expect(isTokenExpired(token, expSeconds * 1000)).toBe(true);
    // After expiry -> expired
    expect(isTokenExpired(token, (expSeconds + 60) * 1000)).toBe(true);
  });

  it('treats tokens without an exp claim as non-expired (server decides)', () => {
    const token = createFakeJwt({ sub: 'arda' });
    expect(getTokenExpiry(token)).toBeNull();
    expect(isTokenExpired(token)).toBe(false);
  });

  it('returns null / expired=true for malformed tokens', () => {
    expect(decodeJwt('not-a-jwt')).toBeNull();
    expect(decodeJwt('a.b.c')).toBeNull();
    expect(isTokenExpired('not-a-jwt')).toBe(true);
  });
});
