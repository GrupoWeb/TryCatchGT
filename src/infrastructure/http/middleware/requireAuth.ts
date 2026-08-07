import { Request, Response, NextFunction } from 'express';
import { env } from '../../../config/env.js';
import { parseCookies, verifySessionToken } from '../auth/session.js';

// Extiende Request para exponer el id de usuario autenticado.
export interface AuthedRequest extends Request {
  userId?: number;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const cookies = parseCookies(req.headers.cookie);
  const session = verifySessionToken(cookies[env.session.cookieName]);

  if (!session) {
    res.status(401).json({ success: false, error: 'No autorizado. Inicia sesión.' });
    return;
  }

  req.userId = session.uid;
  next();
}
