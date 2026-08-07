import { describe, it, expect } from 'vitest';
import { AuthController } from '../../src/infrastructure/http/controllers/AuthController.js';
import { AuthenticateUser } from '../../src/application/use-cases/AuthenticateUser.js';
import { User } from '../../src/domain/entities/User.js';

const hasher: any = { hash: async (p: string) => `h:${p}`, compare: async (p: string, h: string) => h === `h:${p}` };

function fakeRepo(initial: Record<string, unknown> = {}) {
  let props: any = { id: 1, username: 'admin', passwordHash: 'h:correct', ...initial };
  const rec: any = {};
  const build = () => new User(props);
  return {
    findByUsername: async (u: string) => (u.trim().toLowerCase() === props.username ? build() : null),
    findById: async (id: number) => (id === props.id ? build() : null),
    registerFailedLogin: async (_id: number, attempts: number, lockedUntil: Date | null) => { props = { ...props, failedLoginAttempts: attempts, lockedUntil }; rec.failed = { attempts, lockedUntil }; },
    clearLoginFailures: async () => { rec.cleared = true; },
    recordLogin: async (_id: number, ip: string | null) => { rec.recorded = { ip }; props = { ...props, failedLoginAttempts: 0, lockedUntil: null }; },
    _rec: rec,
  } as any;
}

const mockRes = (): any => { const r: any = { statusCode: 200, body: null, cookies: {} }; r.status = (c: number) => { r.statusCode = c; return r; }; r.json = (b: any) => { r.body = b; return r; }; r.cookie = (n: string) => { r.cookies[n] = 1; return r; }; return r; };
const ctrlFor = (repo: any) => new AuthController(new AuthenticateUser(repo, hasher), repo, hasher);
const req = (password: string) => ({ body: { username: 'admin', password }, ip: '1.2.3.4' } as any);

describe('AuthController login', () => {
  it('login correcto abre sesión y registra el acceso', async () => {
    const repo = fakeRepo(); const res = mockRes();
    await ctrlFor(repo).login(req('correct'), res);
    expect(res.statusCode).toBe(200);
    expect(Object.keys(res.cookies)).toHaveLength(1);
    expect(repo._rec.recorded).toBeDefined();
  });

  it('contraseña incorrecta → 401 e incrementa intentos', async () => {
    const repo = fakeRepo(); const res = mockRes();
    await ctrlFor(repo).login(req('mala'), res);
    expect(res.statusCode).toBe(401);
    expect(repo._rec.failed.attempts).toBe(1);
    expect(repo._rec.failed.lockedUntil).toBeNull();
  });

  it('tras 5 intentos fallidos se fija el bloqueo', async () => {
    const repo = fakeRepo(); const ctrl = ctrlFor(repo);
    for (let i = 0; i < 5; i++) await ctrl.login(req('mala'), mockRes());
    expect(repo._rec.failed.attempts).toBe(5);
    expect(repo._rec.failed.lockedUntil).not.toBeNull();
  });

  it('cuenta bloqueada rechaza incluso con contraseña correcta', async () => {
    const repo = fakeRepo({ lockedUntil: new Date(Date.now() + 60000) }); const res = mockRes();
    await ctrlFor(repo).login(req('correct'), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/bloqueada/i);
  });

  it('cuenta inactiva rechaza con 403 aunque la contraseña sea correcta', async () => {
    const repo = fakeRepo({ isActive: false }); const res = mockRes();
    await ctrlFor(repo).login(req('correct'), res);
    expect(res.statusCode).toBe(403);
  });
});
