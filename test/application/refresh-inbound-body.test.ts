import { describe, it, expect, vi } from 'vitest';
import { RefreshInboundBody } from '../../src/application/use-cases/RefreshInboundBody.js';
import { CrmMessage } from '../../src/domain/entities/CrmMessage.js';
import type { CrmMessageRepository } from '../../src/application/ports/output/CrmMessageRepository.js';
import type { InboundMailGateway } from '../../src/application/ports/output/InboundMailGateway.js';
import type { HtmlSanitizer } from '../../src/application/ports/output/HtmlSanitizer.js';

function msg(props: Partial<ConstructorParameters<typeof CrmMessage>[0]> = {}): CrmMessage {
  return new CrmMessage({
    id: 1, contactId: 2, direction: 'in', subject: 's', bodyHtml: 'recorte', status: 'read', ...props,
  });
}
function repo(overrides: Partial<CrmMessageRepository> = {}): CrmMessageRepository {
  return {
    save: async (m) => m,
    findByContact: async () => [],
    findByMessageId: async () => null,
    listInbox: async () => [],
    countUnreadInbound: async () => 0,
    markInboundRead: async () => 0,
    setInboundRead: async () => true,
    softDeleteInbound: async () => true,
    findInboxMessageById: async () => null,
    updateInboundBody: async () => true,
    ...overrides,
  };
}
const passthrough: HtmlSanitizer = { sanitize: (s) => s };
function gateway(fetchFullBody: InboundMailGateway['fetchFullBody']): InboundMailGateway {
  return { markProcessed: async () => true, fetchFullBody };
}

describe('RefreshInboundBody', () => {
  it('devuelve not_found si el correo no existe', async () => {
    const uc = new RefreshInboundBody(repo(), gateway(async () => 'x'), passthrough);
    expect((await uc.execute(9)).outcome).toBe('not_found');
  });

  it('no hace nada si el correo ya está completo', async () => {
    const fetchFullBody = vi.fn(async () => 'nuevo');
    const uc = new RefreshInboundBody(
      repo({ findInboxMessageById: async () => msg({ bodyComplete: true, bodyHtml: 'ya completo' }) }),
      gateway(fetchFullBody), passthrough,
    );
    const r = await uc.execute(1);
    expect(r.outcome).toBe('already');
    expect(r.bodyHtml).toBe('ya completo');
    expect(fetchFullBody).not.toHaveBeenCalled();
  });

  it('devuelve unavailable si está recortado pero no hay bodyUrl', async () => {
    const uc = new RefreshInboundBody(
      repo({ findInboxMessageById: async () => msg({ bodyComplete: false, bodyUrl: null }) }),
      gateway(async () => 'x'), passthrough,
    );
    expect((await uc.execute(1)).outcome).toBe('unavailable');
  });

  it('devuelve failed y conserva el recorte si la descarga falla', async () => {
    const updateInboundBody = vi.fn(async () => true);
    const uc = new RefreshInboundBody(
      repo({ findInboxMessageById: async () => msg({ bodyComplete: false, bodyUrl: 'https://expired', bodyHtml: 'recorte' }), updateInboundBody }),
      gateway(async () => null), passthrough,
    );
    const r = await uc.execute(1);
    expect(r.outcome).toBe('failed');
    expect(r.bodyHtml).toBe('recorte');
    expect(updateInboundBody).not.toHaveBeenCalled();
  });

  it('descarga, sanea y guarda el cuerpo completo (updated)', async () => {
    const updateInboundBody = vi.fn(async () => true);
    const sanitizer: HtmlSanitizer = { sanitize: (s) => s.replace(/<script>.*<\/script>/g, '') };
    const uc = new RefreshInboundBody(
      repo({ findInboxMessageById: async () => msg({ bodyComplete: false, bodyUrl: 'https://ok' }), updateInboundBody }),
      gateway(async () => 'Cuerpo completo<script>alert(1)</script>'), sanitizer,
    );
    const r = await uc.execute(1);
    expect(r.outcome).toBe('updated');
    expect(r.bodyHtml).toBe('Cuerpo completo');
    expect(updateInboundBody).toHaveBeenCalledWith(1, 'Cuerpo completo');
  });
});
