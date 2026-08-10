import { describe, it, expect } from 'vitest';
import { AuthController } from '../../src/infrastructure/http/controllers/AuthController.js';
import { User } from '../../src/domain/entities/User.js';

const hasher: any = { hash: async (p: string) => `h:${p}`, compare: async () => false };
const mockRes = (): any => { const r: any = { statusCode: 200, body: null }; r.status = (c: number) => { r.statusCode = c; return r; }; r.json = (b: any) => { r.body = b; return r; }; return r; };

function build(overrides: any = {}) {
  const calls: any = { issued: 0, sent: 0, updated: null, bumped: null };
  const users: any = {
    findByEmail: async (e: string) => overrides.user ?? null,
    updatePassword: async (id: number) => { calls.updated = id; return true; },
    bumpSessionVersion: async (id: number) => { calls.bumped = id; return 1; },
    ...overrides.users,
  };
  const tokens: any = {
    issue: async () => { calls.issued++; return 'tok'; },
    consume: async () => overrides.consumeId ?? null,
  };
  const email: any = { send: async () => { calls.sent++; return { sent: true }; } };
  const ctrl = new AuthController({} as any, users, hasher, tokens, email);
  return { ctrl, calls };
}

describe('forgotPassword (anti-enumeración)', () => {
  it('correo desconocido → 200 sin emitir token ni enviar', async () => {
    const { ctrl, calls } = build({ user: null });
    const res = mockRes();
    await ctrl.forgotPassword({ body: { email: 'no@existe.com' } } as any, res);
    expect(res.statusCode).toBe(200);
    expect(calls.issued).toBe(0);
    expect(calls.sent).toBe(0);
  });

  it('correo de usuario activo → 200 y envía enlace', async () => {
    const user = new User({ id: 5, username: 'u', passwordHash: 'h', email: 'u@x.com' });
    const { ctrl, calls } = build({ user });
    const res = mockRes();
    await ctrl.forgotPassword({ body: { email: 'u@x.com' } } as any, res);
    expect(res.statusCode).toBe(200);
    expect(calls.issued).toBe(1);
    expect(calls.sent).toBe(1);
  });
});

describe('resetPassword', () => {
  it('contraseña corta → 400', async () => {
    const { ctrl } = build({ consumeId: 5 });
    const res = mockRes();
    await ctrl.resetPassword({ body: { token: 'tok', newPassword: '123' } } as any, res);
    expect(res.statusCode).toBe(400);
  });

  it('token inválido → 400', async () => {
    const { ctrl } = build({ consumeId: null });
    const res = mockRes();
    await ctrl.resetPassword({ body: { token: 'malo', newPassword: 'Nueva-Clave-Segura-2026' } } as any, res);
    expect(res.statusCode).toBe(400);
  });

  it('token válido → cambia contraseña y corta sesiones', async () => {
    const { ctrl, calls } = build({ consumeId: 5 });
    const res = mockRes();
    await ctrl.resetPassword({ body: { token: 'tok', newPassword: 'Nueva-Clave-Segura-2026' } } as any, res);
    expect(res.statusCode).toBe(200);
    expect(calls.updated).toBe(5);
    expect(calls.bumped).toBe(5);
  });
});
