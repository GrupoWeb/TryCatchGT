import { describe, it, expect, vi, afterEach } from 'vitest';
import { HostingerAgenticMailClient } from '../../src/infrastructure/email/HostingerAgenticMailClient.js';
import type { SiteConfigRepository } from '../../src/application/ports/output/SiteConfigRepository.js';

function config(values: Record<string, string>): SiteConfigRepository {
  return { getAll: async () => values, setMany: async () => {} };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HostingerAgenticMailClient', () => {
  it('es inerte si no hay token configurado (no llama al API)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const client = new HostingerAgenticMailClient(config({}));
    const ok = await client.markProcessed('prov-1');
    expect(ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('llama al API con Bearer y PATCH cuando hay token', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new HostingerAgenticMailClient(config({ mailApiToken: 'tok-abc' }));
    const ok = await client.markProcessed('prov-9');
    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/messages/prov-9');
    expect(opts.method).toBe('PATCH');
    expect(opts.headers.Authorization).toBe('Bearer tok-abc');
    expect(JSON.parse(opts.body).seen).toBe(true);
  });

  it('usa la URL base y la carpeta configuradas en el panel', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new HostingerAgenticMailClient(
      config({ mailApiToken: 'tok', mailApiBaseUrl: 'https://mail.midominio.com/v2/', mailApiProcessedFolder: 'Procesados' }),
    );
    await client.markProcessed('m-7');
    const [url, opts] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://mail.midominio.com/v2/messages/m-7');
    expect(JSON.parse(opts.body).folder).toBe('Procesados');
  });

  it('devuelve false si el API responde con error, sin lanzar', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
    const client = new HostingerAgenticMailClient(config({ mailApiToken: 'tok' }));
    await expect(client.markProcessed('prov-x')).resolves.toBe(false);
  });

  it('nunca lanza aunque fetch falle', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    const client = new HostingerAgenticMailClient(config({ mailApiToken: 'tok' }));
    await expect(client.markProcessed('prov-x')).resolves.toBe(false);
  });

  it('devuelve false con un id vacío', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const client = new HostingerAgenticMailClient(config({ mailApiToken: 'tok' }));
    expect(await client.markProcessed('')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
