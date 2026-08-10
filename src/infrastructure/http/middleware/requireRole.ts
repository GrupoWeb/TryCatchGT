import { Response, NextFunction, RequestHandler } from 'express';
import { UserRole } from '../../../domain/entities/User.js';
import { AuthedRequest } from './requireAuth.js';

/**
 * Middleware de autorización por rol. Se encadena SIEMPRE después de requireAuth,
 * que ya deja `req.authUser` poblado. requireAuth verifica *identidad*; requireRole
 * verifica *permisos*: si el rol del usuario no está en la lista permitida, corta
 * con 403 usando el formato de error del resto de la app.
 *
 * Se declara como factory (igual que createRequireAuth):
 *   apiRouter.get('/admin/users', requireAuth, requireRole('admin'), ctrl.listUsers)
 */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    const role = req.authUser?.role;
    if (!role || !roles.includes(role)) {
      res.status(403).json({ success: false, error: 'No tienes permisos para realizar esta acción.' });
      return;
    }
    next();
  };
}
