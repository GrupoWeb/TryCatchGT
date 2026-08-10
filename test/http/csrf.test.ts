import { describe, it, expect } from 'vitest';
import { issueCsrfToken, requireCsrf, createCsrfGuard, CSRF_COOKIE } from '../../src/infrastructure/http/csrf.js';

function mockRes() {
  const res: any = { statusCode: 200, body: null, cookies: {} };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  res.cookie = (n: string, v: string, o: any) => { res.cookies[n] = { v, o }; return res; };
  return res;
}

describe('issueCsrfToken', () => {
  it('emite cookie legible por JS en GET sin cookie previa', () => {
    const res = mockRes(); let nexted = false;
    issueCsrfToken({ method: 'GET', headers: {} } as any, res, () => { nexted = true; });
    expect(nexted).toBe(true);
    expect(res.cookies[CSRF_COOKIE]).toBeDefined();
    expect(res.cookies[CSRF_COOKIE].o.httpOnly).toBe(false);
    expect(res.cookies[CSRF_COOKIE].o.sameSite).toBe('strict');
  });

  it('no emite cookie en métodos mutantes', () => {
    const res = mockRes(); let nexted = false;
    issueCsrfToken({ method: 'POST', headers: {} } as any, res, () => { nexted = true; });
    expect(nexted).toBe(true);
    expect(res.cookies[CSRF_COOKIE]).toBeUndefined();
  });
});

describe('requireCsrf', () => {
  it('pasa cuando cookie y header coinciden', () => {
    const res = mockRes(); let nexted = false;
    requireCsrf({ headers: { cookie: `${CSRF_COOKIE}=tok123`, 'x-csrf-token': 'tok123' } } as any, res, () => { nexted = true; });
    expect(nexted).toBe(true);
  });

  it('403 si falta el header o el token no coincide', () => {
    const r1 = mockRes();
    requireCsrf({ headers: { cookie: `${CSRF_COOKIE}=tok123` } } as any, r1, () => {});
    expect(r1.statusCode).toBe(403);

    const r2 = mockRes();
    requireCsrf({ headers: { cookie: `${CSRF_COOKIE}=tok123`, 'x-csrf-token': 'otro' } } as any, r2, () => {});
    expect(r2.statusCode).toBe(403);
  });
});

describe('createCsrfGuard', () => {
  const guard = createCsrfGuard(['/projects']);

  it('deja pasar los métodos seguros sin token', () => {
    const res = mockRes(); let nexted = false;
    guard({ method: 'GET', path: '/services', headers: {} } as any, res, () => { nexted = true; });
    expect(nexted).toBe(true);
  });

  it('exime la ruta pública /projects del CSRF en POST', () => {
    const res = mockRes(); let nexted = false;
    guard({ method: 'POST', path: '/projects', headers: {} } as any, res, () => { nexted = true; });
    expect(nexted).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it('sigue exigiendo CSRF en otras mutaciones (403 sin token)', () => {
    const res = mockRes(); let nexted = false;
    guard({ method: 'POST', path: '/admin/posts', headers: {} } as any, res, () => { nexted = true; });
    expect(nexted).toBe(false);
    expect(res.statusCode).toBe(403);
  });
});
