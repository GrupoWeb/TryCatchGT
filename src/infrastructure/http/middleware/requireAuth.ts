import { Request, Response, NextFunction, RequestHandler } from 'express';
import { env } from '../../../config/env.js';
import { parseCookies, verifySessionToken } from '../auth/session.js';
import { UserRepository } from '../../../application/ports/output/UserRepository.js';
import { UserSessionRepository } from '../../../application/ports/output/UserSessionRepository.js';
import { User } from '../../../domain/entities/User.js';

// Extiende Request para exponer el usuario autenticado y su sesión.
export interface AuthedRequest extends Request {
  userId?: number;
  authUser?: User;
  sessionSid?: string;
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
// Único endpoint permitido mientras el usuario deba cambiar su contraseña.
const CHANGE_PASSWORD_PATH = '/admin/account/password';

/**
 * Middleware de autenticación. Verifica firma/expiración del token, que la versión
 * de sesión coincida (revocación global) y, si el token trae `sid`, que la sesión
 * por dispositivo siga activa (revocación individual). Además, si el usuario tiene
 * `must_change_password`, bloquea las acciones mutantes salvo el cambio de contraseña.
 */
export function createRequireAuth(users: UserRepository, sessions: UserSessionRepository): RequestHandler {
  return async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    const cookies = parseCookies(req.headers.cookie);
    const session = verifySessionToken(cookies[env.session.cookieName]);

    if (!session) {
      res.status(401).json({ success: false, error: 'No autorizado. Inicia sesión.' });
      return;
    }

    const user = await users.findById(session.uid);
    if (!user || (session.sv ?? 0) !== (user.sessionVersion ?? 0)) {
      res.status(401).json({ success: false, error: 'Tu sesión ya no es válida. Inicia sesión de nuevo.' });
      return;
    }

    // Revocación por dispositivo: el token DEBE traer `sid`. Todo login legítimo lo
    // emite (AuthController.startSession, en sus dos caminos), así que un token forjado
    // sin `sid` —aunque su HMAC sea válido— se rechaza aquí y no puede saltarse la
    // comprobación de sesión activa en `user_sessions`.
    if (!session.sid) {
      res.status(401).json({ success: false, error: 'Tu sesión ya no es válida. Inicia sesión de nuevo.' });
      return;
    }
    const active = await sessions.findActiveBySid(session.sid);
    if (!active || active.userId !== session.uid) {
      res.status(401).json({ success: false, error: 'Esta sesión fue cerrada. Inicia sesión de nuevo.' });
      return;
    }
    req.sessionSid = session.sid;

    req.userId = session.uid;
    req.authUser = user;

    if (user.mustChangePassword && MUTATING.has(req.method) && req.path !== CHANGE_PASSWORD_PATH) {
      res.status(403).json({ success: false, error: 'Debes cambiar tu contraseña antes de continuar.', code: 'PASSWORD_CHANGE_REQUIRED' });
      return;
    }

    next();
  };
}
