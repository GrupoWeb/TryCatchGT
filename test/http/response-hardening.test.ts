import { describe, it, expect, vi } from 'vitest';
import { BlogController } from '../../src/infrastructure/http/controllers/BlogController.js';
import { SiteConfigController } from '../../src/infrastructure/http/controllers/SiteConfigController.js';

const mockRes = (): any => {
  const r: any = { statusCode: 200, body: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: any) => { r.body = b; return r; };
  return r;
};

describe('M1 — los 500 no filtran el detalle interno', () => {
  it('BlogController.list oculta el mensaje del error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const getPosts: any = { execute: async () => { throw new Error('No metadata for "BlogPostEntity" was found.'); } };
    const ctrl = new BlogController(getPosts, { execute: async () => null } as any);
    const res = mockRes();
    await ctrl.list({ query: {} } as any, res);
    expect(res.statusCode).toBe(500);
    expect(res.body.detail).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('BlogPostEntity');
  });
});

describe('M2 — /admin/config no expone secretos y no los borra al guardar', () => {
  function fakeRepo() {
    const rec: any = {};
    return {
      getAll: async () => ({ smtpPass: 'supersecret-smtp', turnstileSecretKey: '0xSECRETKEY', smtpHost: 'smtp.host' }),
      setMany: async (v: any) => { rec.saved = v; },
      _rec: rec,
    } as any;
  }

  it('adminGet enmascara smtpPass y turnstileSecretKey', async () => {
    const ctrl = new SiteConfigController(fakeRepo());
    const res = mockRes();
    await ctrl.adminGet({} as any, res);
    const d = res.body.data;
    expect(d.smtpPass).toBeUndefined();
    expect(d.turnstileSecretKey).toBeUndefined();
    expect(d.smtpConfigured).toBe(true);
    expect(d.turnstileSecretConfigured).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain('supersecret-smtp');
    expect(JSON.stringify(res.body)).not.toContain('0xSECRETKEY');
  });

  it('adminUpdate con secreto vacío NO borra el valor guardado', async () => {
    const repo = fakeRepo();
    const ctrl = new SiteConfigController(repo);
    await ctrl.adminUpdate({ body: { smtpHost: 'nuevo.host', smtpPass: '', turnstileSecretKey: '' } } as any, mockRes());
    expect(repo._rec.saved.smtpHost).toBe('nuevo.host');
    expect(repo._rec.saved.smtpPass).toBeUndefined();
    expect(repo._rec.saved.turnstileSecretKey).toBeUndefined();
  });

  it('adminUpdate con secreto no vacío sí lo actualiza', async () => {
    const repo = fakeRepo();
    const ctrl = new SiteConfigController(repo);
    await ctrl.adminUpdate({ body: { smtpPass: 'clave-nueva' } } as any, mockRes());
    expect(repo._rec.saved.smtpPass).toBe('clave-nueva');
  });
});
