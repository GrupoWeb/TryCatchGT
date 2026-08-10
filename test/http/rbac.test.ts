import { describe, it, expect } from 'vitest';
import { requireRole } from '../../src/infrastructure/http/middleware/requireRole.js';
import { AccountAdminController } from '../../src/infrastructure/http/controllers/AccountAdminController.js';
import { User } from '../../src/domain/entities/User.js';

const mockRes = (): any => {
  const r: any = { statusCode: 200, body: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: any) => { r.body = b; return r; };
  return r;
};

describe('requireRole', () => {
  it('deja pasar cuando el rol está permitido', () => {
    const res = mockRes(); let nexted = false;
    requireRole('admin')({ authUser: { role: 'admin' } } as any, res, () => { nexted = true; });
    expect(nexted).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it('responde 403 a un editor en rutas solo-admin', () => {
    const res = mockRes(); let nexted = false;
    requireRole('admin')({ authUser: { role: 'editor' } } as any, res, () => { nexted = true; });
    expect(nexted).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('responde 403 si no hay usuario autenticado', () => {
    const res = mockRes();
    requireRole('admin')({} as any, res, () => {});
    expect(res.statusCode).toBe(403);
  });
});

// Fake mínimo de UserRepository para updateProfile.
function fakeUsers(role: 'admin' | 'editor') {
  let stored: any = { id: 7, username: 'editor1', passwordHash: 'h', role };
  const rec: any = {};
  return {
    findById: async (id: number) => (id === 7 ? new User(stored) : null),
    updateProfile: async (_id: number, fields: any) => { rec.fields = fields; stored = { ...stored, ...fields }; },
    countAdmins: async () => 5,
    _rec: rec,
  } as any;
}

describe('AccountAdminController.updateProfile — sin auto-escalada de rol', () => {
  it('ignora `role` del body: un editor no se asciende a admin', async () => {
    const users = fakeUsers('editor');
    const ctrl = new AccountAdminController(users, {} as any, {} as any, {} as any, {} as any);
    const res = mockRes();
    await ctrl.updateProfile({ userId: 7, body: { role: 'admin', displayName: 'Editor Uno' } } as any, res);
    expect(res.statusCode).toBe(200);
    // El campo role nunca llega a la capa de persistencia…
    expect(users._rec.fields.role).toBeUndefined();
    // …y el rol devuelto sigue siendo editor.
    expect(res.body.data.role).toBe('editor');
  });
});
