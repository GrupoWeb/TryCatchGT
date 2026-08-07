import { Request, Response, NextFunction, RequestHandler } from 'express';
import { env } from '../../../config/env.js';
import { parseCookies, verifySessionToken } from '../auth/session.js';
import { UserRepository } from '../../../application/ports/output/UserRepository.js';

// Extiende Request para exponer el id de usuario autenticado.
export interface AuthedRequest extends Request {
  userId?: number;
}

/**
 * Middleware de autenticación. Verifica la firma y expiración del token y, además,
 * que la versión de sesión del token siga coincidiendo con la del usuario. Esto
 * permite revocar sesiones (p. ej. "cerrar las demás sesiones" o al cambiar la
 * contraseña) subiendo `session_version`: los tokens emitidos antes dejan de valer.
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
    next();
  };
}
