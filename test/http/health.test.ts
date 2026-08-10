import { describe, it, expect } from 'vitest';
import { createHealthCheck } from '../../src/infrastructure/http/health.js';

const mockRes = (): any => {
  const r: any = { statusCode: 200, body: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: any) => { r.body = b; return r; };
  return r;
};

describe('createHealthCheck — refleja el estado real de la BD (auditoría fase 3)', () => {
  it('200 y db:up cuando la conexión responde a SELECT 1', async () => {
    const health = createHealthCheck({ isInitialized: true, query: async () => [{ 1: 1 }] });
    const res = mockRes();
    await health({} as any, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, status: 'ok', db: 'up' });
  });

  it('503 y db:down cuando la fuente de datos no está inicializada', async () => {
    const health = createHealthCheck({ isInitialized: false, query: async () => [] });
    const res = mockRes();
    await health({} as any, res);
    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ success: false, status: 'degraded', db: 'down' });
  });

  it('503 cuando la consulta a la BD falla (conexión caída)', async () => {
    const health = createHealthCheck({
      isInitialized: true,
      query: async () => { throw new Error('ECONNREFUSED'); },
    });
    const res = mockRes();
    await health({} as any, res);
    expect(res.statusCode).toBe(503);
    expect(res.body.db).toBe('down');
  });

  it('no filtra el detalle del error de la BD en la respuesta', async () => {
    const health = createHealthCheck({
      isInitialized: true,
      query: async () => { throw new Error('Access denied for user root@db'); },
    });
    const res = mockRes();
    await health({} as any, res);
    expect(JSON.stringify(res.body)).not.toContain('Access denied');
  });

  it('cachea el sondeo: un burst de peticiones no dispara un SELECT 1 por cada una', async () => {
    let queries = 0;
    const health = createHealthCheck(
      { isInitialized: true, query: async () => { queries++; return [{ 1: 1 }]; } },
      { cacheMs: 5000 },
    );
    await Promise.all(Array.from({ length: 10 }, () => health({} as any, mockRes())));
    await health({} as any, mockRes());
    expect(queries).toBe(1);
  });

  it('con cacheMs 0 vuelve a sondear en cada petición', async () => {
    let queries = 0;
    const health = createHealthCheck(
      { isInitialized: true, query: async () => { queries++; return [{ 1: 1 }]; } },
      { cacheMs: 0 },
    );
    await health({} as any, mockRes());
    await health({} as any, mockRes());
    expect(queries).toBe(2);
  });
});
