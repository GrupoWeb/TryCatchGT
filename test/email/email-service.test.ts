import { describe, it, expect, vi } from 'vitest';
import { EmailService } from '../../src/infrastructure/email/EmailService.js';

const cfgRepo = (values: Record<string, string>): any => ({ getAll: async () => values, setMany: async () => {} });

describe('EmailService', () => {
  it('sin SMTP configurado degrada a modo dev (no envía, registra en log)', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const svc = new EmailService(cfgRepo({}));
    const res = await svc.send({ to: 'a@b.com', subject: 'Hola', html: '<p>x</p>', text: 'x' });
    expect(res.sent).toBe(false);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
