import { Request, Response } from 'express';

/**
 * Sonda de la fuente de datos que necesita el health check: comprueba que la
 * conexión esté inicializada y que la base responda a una consulta trivial.
 */
export interface HealthDataSource {
  isInitialized: boolean;
  query(sql: string): Promise<unknown>;
}

export interface HealthOptions {
  // Ventana de caché del sondeo a la BD (ms). Acota el `SELECT 1` a como mucho
  // una vez por ventana aunque lleguen muchas peticiones (evita amplificar carga
  // en la BD desde un endpoint público). 0 desactiva la caché (útil en tests).
  cacheMs?: number;
}

/**
 * Handler de `/api/health` que refleja el estado REAL de la base de datos.
 *
 * El servidor arranca aunque la BD falle (no degrada a memoria; las peticiones
 * que la usan devuelven error). Para que el `HEALTHCHECK` del contenedor detecte
 * ese estado, este endpoint devuelve 503 cuando la BD no responde y 200 solo
 * cuando `SELECT 1` tiene éxito. Así un contenedor con la BD caída se marca
 * unhealthy en vez de aparentar estar sano por servir la landing.
 *
 * El resultado del sondeo se cachea unos segundos y las sondas concurrentes se
 * deduplican, para que un endpoint público sin autenticar no se convierta en un
 * amplificador de carga contra la BD (una consulta por petición).
 */
export function createHealthCheck(dataSource: HealthDataSource, options: HealthOptions = {}) {
  const cacheMs = options.cacheMs ?? 5000;
  let cache: { at: number; healthy: boolean } | null = null;
  let inFlight: Promise<boolean> | null = null;

  async function probe(): Promise<boolean> {
    try {
      if (!dataSource.isInitialized) return false;
      await dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async function isHealthy(): Promise<boolean> {
    const now = Date.now();
    if (cache && now - cache.at < cacheMs) return cache.healthy;
    if (!inFlight) {
      inFlight = probe().then((healthy) => {
        cache = { at: Date.now(), healthy };
        inFlight = null;
        return healthy;
      });
    }
    return inFlight;
  }

  return async function health(_req: Request, res: Response): Promise<void> {
    if (await isHealthy()) {
      res.status(200).json({ success: true, status: 'ok', db: 'up', service: 'trycatch-gt-api' });
    } else {
      res.status(503).json({ success: false, status: 'degraded', db: 'down', service: 'trycatch-gt-api' });
    }
  };
}
