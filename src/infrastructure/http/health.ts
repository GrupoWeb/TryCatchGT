import { Request, Response } from 'express';

/**
 * Sonda de la fuente de datos que necesita el health check: comprueba que la
 * conexión esté inicializada y que la base responda a una consulta trivial.
 */
export interface HealthDataSource {
  isInitialized: boolean;
  query(sql: string): Promise<unknown>;
}

/**
 * Handler de `/api/health` que refleja el estado REAL de la base de datos.
 *
 * El servidor arranca aunque la BD falle (no degrada a memoria; las peticiones
 * que la usan devuelven error). Para que el `HEALTHCHECK` del contenedor detecte
 * ese estado, este endpoint devuelve 503 cuando la BD no responde y 200 solo
 * cuando `SELECT 1` tiene éxito. Así un contenedor con la BD caída se marca
 * unhealthy en vez de aparentar estar sano por servir la landing.
 */
export function createHealthCheck(dataSource: HealthDataSource) {
  return async function health(_req: Request, res: Response): Promise<void> {
    try {
      if (!dataSource.isInitialized) throw new Error('DataSource no inicializado');
      await dataSource.query('SELECT 1');
      res.status(200).json({ success: true, status: 'ok', db: 'up', service: 'trycatch-gt-api' });
    } catch {
      res.status(503).json({ success: false, status: 'degraded', db: 'down', service: 'trycatch-gt-api' });
    }
  };
}
