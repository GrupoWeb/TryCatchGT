import crypto from 'node:crypto';
import { Response } from 'express';
import { env } from '../../../config/env.js';

/**
 * Sesión sin estado basada en una cookie firmada con HMAC-SHA256.
 * El token es `<payload>.<firma>`, donde payload es base64url(JSON) con el id
 * de usuario, la expiración y la versión de sesión. No requiere almacenamiento
 * en servidor, pero la versión permite revocar todas las sesiones de un usuario
 * subiendo su `session_version` (el token viejo deja de coincidir).
 */

type TokenKind = 'session' | 'mfa';

interface TokenPayload {
  uid: number;
  exp: number;
  kind: TokenKind;
  sv?: number; // versión de sesión (solo en tokens de sesión)
}

const MFA_CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutos para completar el 2FA

function sign(payload: string): string {
  return crypto.createHmac('sha256', env.session.secret).update(payload).digest('base64url');
}

function make(userId: number, ttlMs: number, kind: TokenKind, sv?: number): string {
  const data: TokenPayload = { uid: userId, exp: Date.now() + ttlMs, kind };
  if (sv !== undefined) data.sv = sv;
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function verify(token: string | undefined, expectedKind: TokenKind): TokenPayload | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as TokenPayload;
    if (typeof data.uid !== 'number' || typeof data.exp !== 'number') return null;
    if (data.kind !== expectedKind) return null; // un reto MFA no vale como sesión
    if (Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

export function createSessionToken(userId: number, sessionVersion = 0): string {
  return make(userId, env.session.maxAgeMs, 'session', sessionVersion);
}
export function verifySessionToken(token: string | undefined): TokenPayload | null {
  return verify(token, 'session');
}

// Emite/renueva la cookie de sesión con el token del usuario (rotación).
export function setSessionCookie(res: Response, userId: number, sessionVersion = 0): void {
  res.cookie(env.session.cookieName, createSessionToken(userId, sessionVersion), {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.isProduction,
    maxAge: env.session.maxAgeMs,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(env.session.cookieName, { path: '/' });
}

// Token de reto emitido tras validar la contraseña, cuando el usuario tiene MFA.
export function createMfaChallenge(userId: number): string {
  return make(userId, MFA_CHALLENGE_TTL_MS, 'mfa');
}
export function verifyMfaChallenge(token: string | undefined): TokenPayload | null {
  return verify(token, 'mfa');
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const jar: Record<string, string> = {};
  if (!header) return jar;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) jar[key] = decodeURIComponent(value);
  }
  return jar;
}
