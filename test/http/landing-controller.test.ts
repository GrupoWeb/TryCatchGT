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
// `seed` alimenta findById (para probar update/setActive).
function memRepo(seed: LandingSample | null = null) {
  const state: { saved: LandingSample | null } = { saved: null };
  const repo = {
    findAll: async () => [],
    findById: async (id: number) => (seed && seed.id === id ? seed : null),
    findBySlug: async () => null,
    save: async (s: LandingSample) => { state.saved = s; return new LandingSample({ ...s, id: s.id ?? 1 }); },
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

  it('rechaza (400) si el HTML decodificado supera 200 KB', async () => {
    const { repo } = memRepo();
    const ctrl = new LandingSampleController(repo);
    const html = `<p>${'x'.repeat((200 * 1024) + 1)}</p>`;
    const res = mockRes();
    await ctrl.create(
      { body: { title: 'Grande', slug: 'grande', htmlBase64: utf8ToBase64(html) }, userId: 1 } as any,
      res as any,
    );
    expect(res.statusCode).toBe(400);
    expect(res.jsonBody.error).toContain('200 KB');
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

  it('al crear sin isActive queda publicada (default del dominio)', async () => {
    const { repo, state } = memRepo();
    const ctrl = new LandingSampleController(repo);
    const res = mockRes();
    await ctrl.create({ body: { title: 'Pub', slug: 'pub', html: '<p>x</p>' }, userId: 1 } as any, res as any);
    expect(state.saved?.isActive).toBe(true);
  });

  it('al crear con isActive=false queda en borrador', async () => {
    const { repo, state } = memRepo();
    const ctrl = new LandingSampleController(repo);
    const res = mockRes();
    await ctrl.create({ body: { title: 'Draft', slug: 'draft', html: '<p>x</p>', isActive: false }, userId: 1 } as any, res as any);
    expect(state.saved?.isActive).toBe(false);
  });
});

describe('LandingSampleController.setActive — toggle sin reenviar el HTML', () => {
  it('despublica conservando el resto de campos', async () => {
    const seed = new LandingSample({ id: 5, slug: 'dm-cafe', title: 'DM Café', html: '<h1>hola</h1>', isActive: true, createdBy: 9 });
    const { repo, state } = memRepo(seed);
    const ctrl = new LandingSampleController(repo);
    const res = mockRes();
    await ctrl.setActive({ params: { id: '5' }, body: { isActive: false } } as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(state.saved?.isActive).toBe(false);
    expect(state.saved?.html).toBe('<h1>hola</h1>'); // el HTML se preserva
    expect(state.saved?.slug).toBe('dm-cafe');
    expect(res.jsonBody.data.isActive).toBe(false);
  });

  it('404 si la muestra no existe', async () => {
    const { repo } = memRepo(null);
    const ctrl = new LandingSampleController(repo);
    const res = mockRes();
    await ctrl.setActive({ params: { id: '99' }, body: { isActive: true } } as any, res as any);
    expect(res.statusCode).toBe(404);
  });

  it('update sin isActive conserva el estado previo (no republica un borrador)', async () => {
    const seed = new LandingSample({ id: 8, slug: 'sitio', title: 'Sitio', html: '<p>v</p>', isActive: false });
    const { repo, state } = memRepo(seed);
    const ctrl = new LandingSampleController(repo);
    const res = mockRes();
    await ctrl.update(
      { params: { id: '8' }, body: { title: 'Sitio', slug: 'sitio', html: '<p>nuevo</p>' }, userId: 1 } as any,
      res as any,
    );
    expect(state.saved?.isActive).toBe(false);
  });
});
