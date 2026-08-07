import { Response, NextFunction, RequestHandler } from 'express';
import { AuditLogRepository } from '../../../application/ports/output/AuditLogRepository.js';
import { AuthedRequest } from './requireAuth.js';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Traduce ruta+método a una etiqueta de acción legible para la bitácora.
function classify(path: string, method: string): string {
  if (path === '/auth/login') return 'auth.login';
  if (path === '/auth/mfa') return 'auth.mfa';
  if (path === '/auth/logout') return 'auth.logout';
  if (path.startsWith('/admin/')) return `admin${path.replace('/admin', '').replace(/\//g, '.')}.${method.toLowerCase()}`;
  return `${method.toLowerCase()} ${path}`;
}

function clientIp(req: AuthedRequest): string | null {
  return (req.ip || req.socket?.remoteAddress || null) as string | null;
}

/**
 * Audita las peticiones mutantes de autenticación y del panel admin. Registra al
 * finalizar la respuesta, de modo que `req.userId` (que fija requireAuth) y el
 * código de estado ya están disponibles. Nunca interrumpe la petición: si el
 * guardado falla, se ignora silenciosamente para no afectar al usuario.
 */
export function createAuditLog(audit: AuditLogRepository): RequestHandler {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    const path = req.path;
    const isAudited = MUTATING.has(req.method) && (path.startsWith('/admin') || path.startsWith('/auth'));
    if (!isAudited) { next(); return; }

    // En intentos de login guardamos el usuario tecleado (útil aunque falle).
    const attempted = path === '/auth/login' && typeof req.body?.username === 'string'
      ? String(req.body.username).slice(0, 150)
      : null;

    res.on('finish', () => {
      void audit.record({
        action: classify(path, req.method),
        actorId: req.userId ?? null,
        actor: attempted,
        ip: clientIp(req),
        method: req.method,
        path,
        status: res.statusCode,
        detail: null,
      }).catch(() => { /* la auditoría nunca rompe la petición */ });
    });

    next();
  };
}
