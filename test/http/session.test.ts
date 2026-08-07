import { describe, it, expect } from 'vitest';
import {
  createSessionToken, verifySessionToken, createMfaChallenge, verifyMfaChallenge,
  parseCookies, setSessionCookie, clearSessionCookie,
} from '../../src/infrastructure/http/auth/session.js';

describe('session tokens', () => {
  it('round-trip de token de sesión con versión', () => {
    const token = createSessionToken(42, 3);
    const payload = verifySessionToken(token);
    expect(payload?.uid).toBe(42);
    expect(payload?.sv).toBe(3);
    expect(payload?.kind).toBe('session');
  });

  it('rechaza token manipulado', () => {
    const token = createSessionToken(1, 0);
    const tampered = token.slice(0, -2) + (token.endsWith('a') ? 'b' : 'a');
    expect(verifySessionToken(tampered)).toBeNull();
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken('sin-punto')).toBeNull();
  });

  it('un reto MFA no vale como sesión y viceversa', () => {
    const challenge = createMfaChallenge(7);
    expect(verifySessionToken(challenge)).toBeNull();
    expect(verifyMfaChallenge(challenge)?.uid).toBe(7);
    expect(verifyMfaChallenge(createSessionToken(7, 0))).toBeNull();
  });
});

describe('parseCookies', () => {
  it('parsea el header de cookies', () => {
    const jar = parseCookies('a=1; b=hola%20mundo; c=');
    expect(jar.a).toBe('1');
    expect(jar.b).toBe('hola mundo');
    expect(parseCookies(undefined)).toEqual({});
  });
});

describe('cookies de sesión', () => {
  it('setSessionCookie usa httpOnly + sameSite strict', () => {
    const calls: any[] = [];
    const res: any = { cookie: (n: string, v: string, o: any) => calls.push({ n, v, o }) };
    setSessionCookie(res, 5, 1);
    expect(calls).toHaveLength(1);
    expect(calls[0].o.httpOnly).toBe(true);
    expect(calls[0].o.sameSite).toBe('strict');
    expect(verifySessionToken(calls[0].v)?.uid).toBe(5);
  });

  it('clearSessionCookie limpia la cookie', () => {
    let cleared = false;
    clearSessionCookie({ clearCookie: () => { cleared = true; } } as any);
    expect(cleared).toBe(true);
  });
});
