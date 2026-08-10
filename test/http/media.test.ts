import { describe, it, expect } from 'vitest';
import { createMediaHandler } from '../../src/infrastructure/http/media.js';

function mockRes() {
  const r: any = { statusCode: 200, headers: {}, body: null, ended: false };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.setHeader = (k: string, v: string) => { r.headers[k] = v; };
  r.send = (b: any) => { r.body = b; return r; };
  r.end = () => { r.ended = true; return r; };
  return r;
}

describe('createMediaHandler — sirve imágenes desde la BD', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

  it('devuelve la imagen con su content-type y cache inmutable', async () => {
    const handler = createMediaHandler({ findById: async () => ({ mime: 'image/png', data: png }), save: async () => 1 });
    const res = mockRes();
    await handler({ params: { id: '5' } } as any, res);
    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('image/png');
    expect(res.headers['Cache-Control']).toContain('immutable');
    expect(res.body).toBe(png);
  });

  it('404 si la imagen no existe', async () => {
    const handler = createMediaHandler({ findById: async () => null, save: async () => 1 });
    const res = mockRes();
    await handler({ params: { id: '999' } } as any, res);
    expect(res.statusCode).toBe(404);
    expect(res.ended).toBe(true);
  });

  it('404 con id no numérico (sin tocar la BD)', async () => {
    let called = false;
    const handler = createMediaHandler({ findById: async () => { called = true; return null; }, save: async () => 1 });
    const res = mockRes();
    await handler({ params: { id: 'abc' } } as any, res);
    expect(res.statusCode).toBe(404);
    expect(called).toBe(false);
  });
});
