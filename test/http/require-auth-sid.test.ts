import { describe, it, expect } from 'vitest';
import { createRequireAuth } from '../../src/infrastructure/http/middleware/requireAuth.js';
import { createSessionToken } from '../../src/infrastructure/http/auth/session.js';
import { User } from '../../src/domain/entities/User.js';
import { env } from '../../src/config/env.js';

const mockRes = (): any => {
  const r: any = { statusCode: 200, body: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: any) => { r.body = b; return r; };
  return r;
};

const users: any = {
  findById: async (id: number) => new User({ id, username: 'admin', passwordHash: 'h', sessionVersion: 0 }),
};
const reqWith = (token: string) => ({
  headers: { cookie: `${env.session.cookieName}=${token}` },
  method: 'GET',
  path: '/auth/me',
} as any);

describe('requireAuth — exige sid (anti-forja de sesión)', () => {
  it('rechaza con 401 un token HMAC válido pero SIN sid', async () => {
    const sessions: any = { findActiveBySid: async () => null };
    const mw = createRequireAuth(users, sessions);
    const forged = createSessionToken(1, 0); // firma válida, sin sid
    const res = mockRes(); let nexted = false;
    await mw(reqWith(forged), res, () => { nexted = true; });
    expect(nexted).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it('acepta un token con sid cuya sesión sigue activa', async () => {
    const sessions: any = { findActiveBySid: async (sid: string) => ({ sid, userId: 1 }) };
    const mw = createRequireAuth(users, sessions);
    const good = createSessionToken(1, 0, 'sid-abc'); // con sid
    const res = mockRes(); let nexted = false;
    await mw(reqWith(good), res, () => { nexted = true; });
    expect(nexted).toBe(true);
    expect(res.statusCode).toBe(200);
  });
});
