import { describe, it, expect } from 'vitest';
import { AuthController } from '../../src/infrastructure/http/controllers/AuthController.js';
import { createMfaChallenge } from '../../src/infrastructure/http/auth/session.js';
import { User } from '../../src/domain/entities/User.js';

const hasher: any = { hash: async (p: string) => `h:${p}`, compare: async () => false };
const sessions: any = { create: async () => {}, findActiveBySid: async () => null };

function fakeRepo(initial: Record<string, unknown> = {}) {
  let props: any = { id: 1, username: 'admin', passwordHash: 'h', mfaEnabled: true, mfaSecret: 'JBSWY3DPEHPK3PXP', ...initial };
  const rec: any = {};
  return {
    findById: async (id: number) => (id === props.id ? new User(props) : null),
    registerFailedLogin: async (_id: number, attempts: number, lockedUntil: Date | null) => {
      props = { ...props, failedLoginAttempts: attempts, lockedUntil }; rec.failed = { attempts, lockedUntil };
    },
    recordLogin: async () => { props = { ...props, failedLoginAttempts: 0, lockedUntil: null }; },
    setBackupCodes: async () => {},
    _rec: rec,
  } as any;
}

const mockRes = (): any => { const r: any = { statusCode: 200, body: null, cookies: {} }; r.status = (c: number) => { r.statusCode = c; return r; }; r.json = (b: any) => { r.body = b; return r; }; r.cookie = (n: string) => { r.cookies[n] = 1; return r; }; return r; };
const ctrlFor = (repo: any) => new AuthController({} as any, repo, hasher, {} as any, {} as any, sessions);
// Código MFA vacío → siempre inválido (evita depender del TOTP del momento).
const req = () => ({ body: { challenge: createMfaChallenge(1), code: '' }, ip: '1.2.3.4', headers: {} } as any);

describe('AuthController.mfaVerify — lockout del segundo factor (M3)', () => {
  it('código MFA incorrecto incrementa el contador de fallos', async () => {
    const repo = fakeRepo(); const res = mockRes();
    await ctrlFor(repo).mfaVerify(req(), res);
    expect(res.statusCode).toBe(401);
    expect(repo._rec.failed.attempts).toBe(1);
    expect(repo._rec.failed.lockedUntil).toBeNull();
  });

  it('tras 5 fallos de MFA se fija el bloqueo', async () => {
    const repo = fakeRepo(); const ctrl = ctrlFor(repo);
    for (let i = 0; i < 5; i++) await ctrl.mfaVerify(req(), mockRes());
    expect(repo._rec.failed.attempts).toBe(5);
    expect(repo._rec.failed.lockedUntil).not.toBeNull();
  });

  it('cuenta bloqueada rechaza la verificación MFA', async () => {
    const repo = fakeRepo({ lockedUntil: new Date(Date.now() + 60000) }); const res = mockRes();
    await ctrlFor(repo).mfaVerify(req(), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/bloqueada/i);
  });
});
