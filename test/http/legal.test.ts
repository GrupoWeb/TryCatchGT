import { describe, it, expect } from 'vitest';
import { LegalController } from '../../src/infrastructure/http/controllers/LegalController.js';
import { LEGAL_DEFAULTS } from '../../src/infrastructure/http/legalDefaults.js';

const mockRes = (): any => {
  const r: any = { statusCode: 200, body: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: any) => { r.body = b; return r; };
  return r;
};

function fakeConfig(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial };
  return {
    getAll: async () => ({ ...store }),
    setMany: async (v: Record<string, string>) => { Object.assign(store, v); },
    _store: store,
  } as any;
}

// Sanitizer de prueba: elimina <script> para verificar que se aplica al guardar.
const sanitizer: any = { sanitize: (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, '') };

describe('LegalController', () => {
  it('getPublic devuelve el contenido por defecto si no se ha editado', async () => {
    const ctrl = new LegalController(fakeConfig(), sanitizer);
    const res = mockRes();
    await ctrl.getPublic({ params: { slug: 'cookies' } } as any, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.html).toBe(LEGAL_DEFAULTS.cookies);
  });

  it('getPublic devuelve el contenido guardado si existe', async () => {
    const ctrl = new LegalController(fakeConfig({ legal_terminos: '<h2>Editado</h2>' }), sanitizer);
    const res = mockRes();
    await ctrl.getPublic({ params: { slug: 'terminos' } } as any, res);
    expect(res.body.data.html).toBe('<h2>Editado</h2>');
  });

  it('getPublic 404 con slug inválido', async () => {
    const ctrl = new LegalController(fakeConfig(), sanitizer);
    const res = mockRes();
    await ctrl.getPublic({ params: { slug: 'otra-cosa' } } as any, res);
    expect(res.statusCode).toBe(404);
  });

  it('update sanea el HTML y lo guarda bajo la clave de la página', async () => {
    const config = fakeConfig();
    const ctrl = new LegalController(config, sanitizer);
    const res = mockRes();
    await ctrl.update({ params: { slug: 'privacidad' }, body: { html: '<p>ok</p><script>alert(1)</script>' } } as any, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.html).toBe('<p>ok</p>');
    expect(config._store.legal_privacidad).toBe('<p>ok</p>');
  });

  it('getAllAdmin devuelve las tres páginas', async () => {
    const ctrl = new LegalController(fakeConfig({ legal_cookies: '<h2>C</h2>' }), sanitizer);
    const res = mockRes();
    await ctrl.getAllAdmin({} as any, res);
    expect(Object.keys(res.body.data).sort()).toEqual(['cookies', 'privacidad', 'terminos']);
    expect(res.body.data.cookies).toBe('<h2>C</h2>');
    expect(res.body.data.terminos).toBe(LEGAL_DEFAULTS.terminos);
  });
});
