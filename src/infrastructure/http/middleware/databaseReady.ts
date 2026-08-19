import { NextFunction, Request, RequestHandler, Response } from 'express';

export interface DatabaseReadyDataSource {
  isInitialized: boolean;
}

/**
 * Cuando el servidor arranca en modo degradado porque MySQL no inicializó, ninguna
 * ruta API que use repositorios debe ejecutarse: TypeORM lanzaría rechazos async no
 * gestionados en Express 4. El healthcheck queda montado antes de este guard.
 */
export function createDatabaseReadyGuard(dataSource: DatabaseReadyDataSource): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction): void => {
    if (!dataSource.isInitialized) {
      res.status(503).json({
        success: false,
        error: 'Base de datos no disponible. Intenta de nuevo en unos minutos.',
      });
      return;
    }
    next();
  };
}
