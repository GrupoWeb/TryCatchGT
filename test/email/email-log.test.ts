import { describe, it, expect, vi, afterEach } from 'vitest';
import { escapeHtml } from '../../src/infrastructure/security/escapeHtml.js';

describe('escapeHtml (M6)', () => {
  it('neutraliza el HTML de valores dinámicos', () => {
    const out = escapeHtml('<img src=x onerror=alert(1)>');
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img');
  });
});

describe('EmailService — no loguea el cuerpo en producción (M5)', () => {
  const savedEnv = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = savedEnv; vi.restoreAllMocks(); });

  async function loadService(nodeEnv: string) {
    vi.resetModules();
    process.env.NODE_ENV = nodeEnv;
    const { EmailService } = await import('../../src/infrastructure/email/EmailService.js');
    // Config sin SMTP → cae al modo "no enviado".
    return new EmailService({ getAll: async () => ({}) } as any);
  }

  it('en producción no imprime el enlace con el token', async () => {
    const svc = await loadService('production');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const r = await svc.send({ to: 'a@b.com', subject: 'Reset', html: '<p>x</p>', text: 'https://app/reset?token=SECRETO-123' });
    expect(r.sent).toBe(false);
    const printed = [...warn.mock.calls, ...log.mock.calls].flat().join(' ');
    expect(printed).not.toContain('SECRETO-123');
  });

  it('en desarrollo sí imprime el cuerpo (modo dev)', async () => {
    const svc = await loadService('development');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await svc.send({ to: 'a@b.com', subject: 'Reset', html: '<p>x</p>', text: 'token-dev-XYZ' });
    const printed = log.mock.calls.flat().join(' ');
    expect(printed).toContain('token-dev-XYZ');
  });
});
