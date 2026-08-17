import { describe, it, expect } from 'vitest';
import { createLandingHandler } from '../../src/infrastructure/http/landing.js';
import { LandingSample } from '../../src/domain/entities/LandingSample.js';

function mockRes() {
  const r: any = { statusCode: 200, headers: {}, body: null, type_: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.setHeader = (k: string, v: string) => { r.headers[k] = v; };
  r.type = (t: string) => { r.type_ = t; return r; };
  r.send = (b: any) => { r.body = b; return r; };
  return r;
}

// Repo mínimo en memoria (solo findBySlug es relevante para el servido).
function repoWith(sample: LandingSample | null) {
  return {
    findAll: async () => [],
    findById: async () => null,
    findBySlug: async (slug: string) => (sample && sample.slug === slug ? sample : null),
    save: async (s: LandingSample) => s,
    delete: async () => true,
  };
}

const sample = new LandingSample({ id: 1, slug: 'demo-ferreteria', title: 'Demo', html: '<h1>Hola</h1>' });

describe('createLandingHandler — sirve muestras aisladas con CSP sandbox', () => {
  it('sirve el HTML con CSP sandbox (sin allow-same-origin) y noindex', async () => {
    const handler = createLandingHandler(repoWith(sample));
    const res = mockRes();
    await handler({ params: { slug: 'demo-ferreteria' } } as any, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('<h1>Hola</h1>');
    expect(res.headers['Content-Security-Policy']).toBe('sandbox allow-scripts allow-popups allow-forms');
    expect(res.headers['Content-Security-Policy']).not.toContain('allow-same-origin');
    expect(res.headers['X-Robots-Tag']).toBe('noindex, nofollow');
    expect(res.headers['Content-Type']).toBe('text/html; charset=utf-8');
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('normaliza el slug a minúsculas antes de buscar', async () => {
    const handler = createLandingHandler(repoWith(sample));
    const res = mockRes();
    await handler({ params: { slug: 'Demo-Ferreteria' } } as any, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('<h1>Hola</h1>');
  });

  it('404 en texto plano si la muestra no existe', async () => {
    const handler = createLandingHandler(repoWith(null));
    const res = mockRes();
    await handler({ params: { slug: 'no-existe' } } as any, res);
    expect(res.statusCode).toBe(404);
    expect(res.type_).toBe('text/plain');
  });

  it('404 si la muestra existe pero está en borrador (isActive=false)', async () => {
    const draft = new LandingSample({ id: 2, slug: 'borrador', title: 'Borrador', html: '<h1>Oculto</h1>', isActive: false });
    const handler = createLandingHandler(repoWith(draft));
    const res = mockRes();
    await handler({ params: { slug: 'borrador' } } as any, res);
    expect(res.statusCode).toBe(404);
    expect(res.body).not.toBe('<h1>Oculto</h1>'); // no filtra el contenido ni la existencia
  });
});
