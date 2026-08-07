import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { parseCookies } from './auth/session.js';

/**
 * Protección CSRF con el patrón "double-submit cookie".
 *
 * Se emite una cookie legible por JS (`XSRF-TOKEN`, NO httpOnly) con un token
 * aleatorio. El frontend la lee y reenvía su valor en el header `X-CSRF-Token`
 * en cada petición mutante. El servidor exige que cookie y header coincidan.
 *
 * La seguridad no depende de que el token sea secreto, sino de la política de
 * mismo origen: un atacante en otro dominio puede forzar el envío de la cookie,
 * pero no puede LEER su valor para copiarlo en el header.
 */

export const CSRF_COOKIE = 'XSRF-TOKEN';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// Emite la cookie CSRF (si aún no existe) en las peticiones seguras. Se aplica
// al inicio del router para que cualquier GET del SPA reciba un token utilizable.
export function issueCsrfToken(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method) && !parseCookies(req.headers.cookie)[CSRF_COOKIE]) {
    res.cookie(CSRF_COOKIE, generateToken(), {
      httpOnly: false, // el frontend DEBE poder leerla para reenviarla en el header
      sameSite: 'strict',
      secure: env.isProduction,
      path: '/',
    });
  }
  next();
}

// Verifica el double-submit: la cookie y el header deben existir y coincidir.
export function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  const cookieToken = parseCookies(req.headers.cookie)[CSRF_COOKIE];
  const raw = req.headers[CSRF_HEADER];
  const headerToken = Array.isArray(raw) ? raw[0] : raw;

  if (!cookieToken || !headerToken) {
    res.status(403).json({ success: false, error: 'Token CSRF ausente.' });
    return;
  }

  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(403).json({ success: false, error: 'Token CSRF inválido.' });
    return;
  }

  next();
}
