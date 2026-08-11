import { describe, it, expect, vi } from 'vitest';
import { ReceiveInboundEmail } from '../../src/application/use-cases/ReceiveInboundEmail.js';
import { parseInboundPayload } from '../../src/infrastructure/http/controllers/HostingerMailWebhookController.js';
import { Contact } from '../../src/domain/entities/Contact.js';
import { CrmMessage } from '../../src/domain/entities/CrmMessage.js';
import { InvalidCrmMessageError } from '../../src/domain/exceptions/DomainError.js';
import type { ContactRepository } from '../../src/application/ports/output/ContactRepository.js';
import type { CrmMessageRepository } from '../../src/application/ports/output/CrmMessageRepository.js';
import type { HtmlSanitizer } from '../../src/application/ports/output/HtmlSanitizer.js';

function contactRepo(overrides: Partial<ContactRepository> = {}): ContactRepository {
  return {
    save: async (c) => c,
    findAll: async () => [],
    findById: async () => null,
    findByEmail: async () => null,
    updateStage: async () => true,
    update: async () => true,
    countByStage: async () => ({}),
    ...overrides,
  };
}
function messageRepo(overrides: Partial<CrmMessageRepository> = {}): CrmMessageRepository {
  return {
    save: async (m) => m,
    findByContact: async () => [],
    findByMessageId: async () => null,
    ...overrides,
  };
}
const passthrough: HtmlSanitizer = { sanitize: (s) => s };

describe('parseInboundPayload', () => {
  it('extrae los campos de un payload anidado con from tipo string', () => {
    const p = parseInboundPayload({
      event: 'message.received',
      data: { message: { from: 'Ana Pérez <ana@x.com>', subject: 'Hola', html: '<p>Hi</p>', message_id: '<m1@x>', in_reply_to: '<m0@x>', date: '2026-08-11T10:00:00Z' } },
    });
    expect(p).not.toBeNull();
    expect(p!.fromEmail).toBe('ana@x.com');
    expect(p!.fromName).toBe('Ana Pérez');
    expect(p!.subject).toBe('Hola');
    expect(p!.bodyHtml).toBe('<p>Hi</p>');
    expect(p!.messageId).toBe('<m1@x>');
    expect(p!.inReplyTo).toBe('<m0@x>');
    expect(p!.receivedAt).toBeInstanceOf(Date);
  });

  it('acepta from como objeto {address,name}', () => {
    const p = parseInboundPayload({ from: { address: 'juan@y.com', name: 'Juan' }, subject: 'x' });
    expect(p!.fromEmail).toBe('juan@y.com');
    expect(p!.fromName).toBe('Juan');
  });

  it('extrae el id interno del proveedor (providerId) para el acuse de recibo', () => {
    const p = parseInboundPayload({ data: { message: { from: 'a@x.com', id: 'prov-123', message_id: '<rfc@x>' } } });
    expect(p!.providerId).toBe('prov-123');
    expect(p!.messageId).toBe('<rfc@x>');
  });

  it('devuelve null si no hay remitente', () => {
    expect(parseInboundPayload({ data: { message: { subject: 'x' } } })).toBeNull();
    expect(parseInboundPayload(null)).toBeNull();
  });
});

describe('ReceiveInboundEmail', () => {
  it('registra el correo en un contacto existente y avanza a "respondio"', async () => {
    const ana = new Contact({ id: 1, name: 'Ana', email: 'ana@x.com', stage: 'contactado' });
    const saveMsg = vi.fn(async (m: CrmMessage) => m);
    const updateStage = vi.fn(async () => true);
    const saveContact = vi.fn();
    const uc = new ReceiveInboundEmail(
      contactRepo({ findByEmail: async () => ana, updateStage, save: saveContact }),
      messageRepo({ save: saveMsg }),
      passthrough,
    );
    const res = await uc.execute({ fromEmail: 'ana@x.com', subject: 'Re: Hola', bodyHtml: '<p>Va</p>', messageId: '<m2@x>' });
    expect(res.outcome).toBe('stored');
    expect(res.contactCreated).toBe(false);
    expect(saveContact).not.toHaveBeenCalled();
    const saved = saveMsg.mock.calls[0][0] as CrmMessage;
    expect(saved.direction).toBe('in');
    expect(saved.status).toBe('received');
    expect(saved.contactId).toBe(1);
    expect(updateStage).toHaveBeenCalledWith(1, 'respondio');
  });

  it('crea el contacto si el remitente es desconocido', async () => {
    const saveContact = vi.fn(async (c: Contact) => new Contact({ id: 9, name: c.name, email: c.email.getValue(), source: c.source, stage: c.stage }));
    const uc = new ReceiveInboundEmail(
      contactRepo({ findByEmail: async () => null, save: saveContact }),
      messageRepo(),
      passthrough,
    );
    const res = await uc.execute({ fromEmail: 'Nuevo@Cliente.com', subject: 'Consulta' });
    expect(res.contactCreated).toBe(true);
    const created = saveContact.mock.calls[0][0] as Contact;
    expect(created.email.getValue()).toBe('nuevo@cliente.com');
    expect(created.source).toBe('inbound');
  });

  it('es idempotente: no duplica si el messageId ya existe', async () => {
    const existing = new CrmMessage({ id: 5, contactId: 1, direction: 'in', subject: 'x', bodyHtml: '', status: 'received', messageId: '<dup@x>' });
    const saveMsg = vi.fn(async (m: CrmMessage) => m);
    const uc = new ReceiveInboundEmail(
      contactRepo({ findByEmail: async () => new Contact({ id: 1, name: 'A', email: 'a@x.com' }) }),
      messageRepo({ findByMessageId: async () => existing, save: saveMsg }),
      passthrough,
    );
    const res = await uc.execute({ fromEmail: 'a@x.com', messageId: '<dup@x>' });
    expect(res.outcome).toBe('duplicate');
    expect(saveMsg).not.toHaveBeenCalled();
  });

  it('sanea el cuerpo entrante', async () => {
    const saveMsg = vi.fn(async (m: CrmMessage) => m);
    const sanitizer: HtmlSanitizer = { sanitize: (s) => s.replace(/<script>.*<\/script>/g, '') };
    const uc = new ReceiveInboundEmail(
      contactRepo({ findByEmail: async () => new Contact({ id: 1, name: 'A', email: 'a@x.com' }) }),
      messageRepo({ save: saveMsg }),
      sanitizer,
    );
    await uc.execute({ fromEmail: 'a@x.com', bodyHtml: 'Hola<script>alert(1)</script>' });
    expect((saveMsg.mock.calls[0][0] as CrmMessage).bodyHtml).toBe('Hola');
  });

  it('lanza si no hay remitente', async () => {
    const uc = new ReceiveInboundEmail(contactRepo(), messageRepo(), passthrough);
    await expect(uc.execute({ fromEmail: '  ' })).rejects.toBeInstanceOf(InvalidCrmMessageError);
  });

  it('corta las cadencias activas del contacto al recibir respuesta', async () => {
    const stopActiveByContact = vi.fn(async () => 2);
    const cadenceRuns = {
      save: async (r: any) => r,
      findDue: async () => [],
      findByContact: async () => [],
      findActive: async () => null,
      stopActiveByContact,
    };
    const uc = new ReceiveInboundEmail(
      contactRepo({ findByEmail: async () => new Contact({ id: 1, name: 'A', email: 'a@x.com', stage: 'contactado' }) }),
      messageRepo(),
      passthrough,
      cadenceRuns,
    );
    await uc.execute({ fromEmail: 'a@x.com', subject: 'Re' });
    expect(stopActiveByContact).toHaveBeenCalledWith(1);
  });
});
