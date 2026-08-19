import { describe, expect, it } from 'vitest';
import { createDatabaseReadyGuard } from '../../src/infrastructure/http/middleware/databaseReady.js';

function mockRes() {
  const r: any = { statusCode: 200, jsonBody: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: unknown) => { r.jsonBody = b; return r; };
  return r;
}

describe('createDatabaseReadyGuard', () => {
  it('responde 503 si TypeORM no inicializó', () => {
    const guard = createDatabaseReadyGuard({ isInitialized: false });
    const res = mockRes();
    let nextCalled = false;

    guard({} as any, res as any, () => { nextCalled = true; });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(503);
    expect(res.jsonBody.success).toBe(false);
  });

  it('continúa si la conexión está inicializada', () => {
    const guard = createDatabaseReadyGuard({ isInitialized: true });
    const res = mockRes();
    let nextCalled = false;

    guard({} as any, res as any, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(200);
  });
});
