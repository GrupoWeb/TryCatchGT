import { describe, it, expect } from 'vitest';
import { LandingSampleController } from '../../src/infrastructure/http/controllers/LandingSampleController.js';
import { LandingSample } from '../../src/domain/entities/LandingSample.js';

function mockRes() {
  const r: any = { statusCode: 200, jsonBody: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: any) => { r.jsonBody = b; return r; };
  return r;
}

// Repo en memoria: captura lo guardado y no encuentra choques de slug.
function memRepo() {
  const state: { saved: LandingSample | null } = { saved: null };
  const repo = {
    findAll: async () => [],
    findById: async () => null,
    findBySlug: async () => null,
    save: async (s: LandingSample) => { state.saved = s; return new LandingSample({ ...s, id: 1 }); },
    delete: async () => true,
  };
  return { repo, state };
}

const utf8ToBase64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');

describe('LandingSampleController.create — el HTML llega en base64', () => {
  it('decodifica htmlBase64 (con Unicode) y lo guarda tal cual', async () => {
    const { repo, state } = memRepo();
    const ctrl = new LandingSampleController(repo);
    const html = '<h1>Café ☕</h1><script>alert(1)</script>';
    const res = mockRes();
    await ctrl.create(
      { body: { title: 'DM Café', slug: 'dm-cafe', htmlBase64: utf8ToBase64(html) }, userId: 7 } as any,
      res as any,
    );
    expect(res.statusCode).toBe(201);
    expect(state.saved?.html).toBe(html); // decodificado correctamente, sin sanear
    expect(state.saved?.slug).toBe('dm-cafe');
    expect(res.jsonBody.data.html).toBe(html);
  });

  it('rechaza (400) si el HTML decodificado queda vacío', async () => {
    const { repo } = memRepo();
    const ctrl = new LandingSampleController(repo);
    const res = mockRes();
    await ctrl.create(
      { body: { title: 'Vacío', htmlBase64: utf8ToBase64('   ') }, userId: 1 } as any,
      res as any,
    );
    expect(res.statusCode).toBe(400);
    expect(res.jsonBody.success).toBe(false);
  });

  it('acepta el campo `html` en crudo como respaldo (compatibilidad)', async () => {
    const { repo, state } = memRepo();
    const ctrl = new LandingSampleController(repo);
    const res = mockRes();
    await ctrl.create(
      { body: { title: 'Legacy', slug: 'legacy', html: '<p>hola</p>' }, userId: 1 } as any,
      res as any,
    );
    expect(res.statusCode).toBe(201);
    expect(state.saved?.html).toBe('<p>hola</p>');
  });
});
