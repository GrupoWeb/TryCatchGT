import { Request, Response, NextFunction, RequestHandler } from 'express';
import { env } from '../../../config/env.js';
import { parseCookies, verifySessionToken } from '../auth/session.js';
import { UserRepository } from '../../../application/ports/output/UserRepository.js';
import { User } from '../../../domain/entities/User.js';

// Extiende Request para exponer el usuario autenticado.
export interface AuthedRequest extends Request {
  userId?: number;
  authUser?: User;
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
// Único endpoint permitido mientras el usuario deba cambiar su contraseña.
const CHANGE_PASSWORD_PATH = '/admin/account/password';

/**
 * Middleware de autenticación. Verifica firma/expiración del token y que la versión
 * de sesión siga coincidiendo (permite revocar sesiones). Además, si el usuario tiene
 * `must_change_password`, bloquea cualquier acción mutante salvo el propio cambio de
 * contraseña, forzando el flujo.
 */
export function createRequireAuth(users: UserRepository): RequestHandler {
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

    req.userId = session.uid;
    req.authUser = user;

    if (user.mustChangePassword && MUTATING.has(req.method) && req.path !== CHANGE_PASSWORD_PATH) {
      res.status(403).json({ success: false, error: 'Debes cambiar tu contraseña antes de continuar.', code: 'PASSWORD_CHANGE_REQUIRED' });
      return;
    }

    next();
  };
}
