import { describe, it, expect, vi } from 'vitest';
import { SaveEmailTemplate } from '../../src/application/use-cases/SaveEmailTemplate.js';
import { SendContactEmail } from '../../src/application/use-cases/SendContactEmail.js';
import { GetContactMessages } from '../../src/application/use-cases/GetContactMessages.js';
import { Contact } from '../../src/domain/entities/Contact.js';
import { EmailTemplate } from '../../src/domain/entities/EmailTemplate.js';
import { CrmMessage } from '../../src/domain/entities/CrmMessage.js';
import { InvalidContactError, InvalidCrmMessageError } from '../../src/domain/exceptions/DomainError.js';
import type { ContactRepository } from '../../src/application/ports/output/ContactRepository.js';
import type { EmailTemplateRepository } from '../../src/application/ports/output/EmailTemplateRepository.js';
import type { CrmMessageRepository } from '../../src/application/ports/output/CrmMessageRepository.js';
import type { EmailSender } from '../../src/application/ports/output/EmailSender.js';
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

function templateRepo(overrides: Partial<EmailTemplateRepository> = {}): EmailTemplateRepository {
  return {
    save: async (t) => t,
    update: async (_id, t) => t,
    findAll: async () => [],
    findById: async () => null,
    delete: async () => true,
    ...overrides,
  };
}

function messageRepo(overrides: Partial<CrmMessageRepository> = {}): CrmMessageRepository {
  return {
    save: async (m) => m,
    findByContact: async () => [],
    ...overrides,
  };
}

const passthroughSanitizer: HtmlSanitizer = { sanitize: (s) => s };
const okSender: EmailSender = { send: async () => ({ sent: true, messageId: '<abc@smtp>' }) };

describe('SaveEmailTemplate', () => {
  it('sanea el cuerpo antes de guardar', async () => {
    const save = vi.fn(async (t: EmailTemplate) => t);
    const sanitizer: HtmlSanitizer = { sanitize: (s) => s.replace(/<script>.*<\/script>/g, '') };
    const uc = new SaveEmailTemplate(templateRepo({ save }), sanitizer);
    const t = await uc.execute({ name: 'X', subject: 'S', bodyHtml: 'Hola<script>alert(1)</script>' });
    expect(t.bodyHtml).toBe('Hola');
    expect(save).toHaveBeenCalledOnce();
  });

  it('actualiza cuando trae id', async () => {
    const update = vi.fn(async (_id: number, t: EmailTemplate) => t);
    const uc = new SaveEmailTemplate(templateRepo({ update }), passthroughSanitizer);
    await uc.execute({ id: 7, name: 'X', subject: 'S', bodyHtml: 'B' });
    expect(update).toHaveBeenCalledWith(7, expect.any(EmailTemplate));
  });
});

describe('SendContactEmail', () => {
  const ana = new Contact({ id: 1, name: 'Ana', email: 'ana@x.com', company: 'ACME', stage: 'nuevo' });
  const template = new EmailTemplate({ id: 3, name: 'Intro', subject: 'Hola {nombre}', bodyHtml: '<p>{empresa}</p>' });

  it('envía desde plantilla, registra el mensaje y avanza la etapa', async () => {
    const send = vi.fn(async () => ({ sent: true, messageId: '<m1>' }));
    const saveMsg = vi.fn(async (m: CrmMessage) => m);
    const updateStage = vi.fn(async () => true);
    const uc = new SendContactEmail(
      contactRepo({ findById: async () => ana, updateStage }),
      templateRepo({ findById: async () => template }),
      messageRepo({ save: saveMsg }),
      { send },
      passthroughSanitizer,
    );

    const res = await uc.execute({ contactId: 1, templateId: 3, advanceStage: true });

    expect(res.sent).toBe(true);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'ana@x.com', subject: 'Hola Ana' }));
    const saved = saveMsg.mock.calls[0][0] as CrmMessage;
    expect(saved.status).toBe('sent');
    expect(saved.bodyHtml).toBe('<p>ACME</p>');
    expect(saved.templateId).toBe(3);
    expect(updateStage).toHaveBeenCalledWith(1, 'contactado');
  });

  it('registra "failed" y no avanza etapa cuando el envío no sale', async () => {
    const saveMsg = vi.fn(async (m: CrmMessage) => m);
    const updateStage = vi.fn(async () => true);
    const uc = new SendContactEmail(
      contactRepo({ findById: async () => ana, updateStage }),
      templateRepo({ findById: async () => template }),
      messageRepo({ save: saveMsg }),
      { send: async () => ({ sent: false }) },
      passthroughSanitizer,
    );

    const res = await uc.execute({ contactId: 1, templateId: 3, advanceStage: true });

    expect(res.sent).toBe(false);
    expect((saveMsg.mock.calls[0][0] as CrmMessage).status).toBe('failed');
    expect(updateStage).not.toHaveBeenCalled();
  });

  it('lanza si el contacto no existe', async () => {
    const uc = new SendContactEmail(contactRepo(), templateRepo(), messageRepo(), okSender, passthroughSanitizer);
    await expect(uc.execute({ contactId: 99, subject: 'a', bodyHtml: 'b' })).rejects.toBeInstanceOf(InvalidContactError);
  });

  it('lanza si no hay plantilla ni asunto/cuerpo', async () => {
    const uc = new SendContactEmail(
      contactRepo({ findById: async () => ana }),
      templateRepo(),
      messageRepo(),
      okSender,
      passthroughSanitizer,
    );
    await expect(uc.execute({ contactId: 1 })).rejects.toBeInstanceOf(InvalidCrmMessageError);
  });
});

describe('GetContactMessages', () => {
  it('devuelve los mensajes del contacto', async () => {
    const msg = new CrmMessage({ contactId: 1, direction: 'out', subject: 'Hi', bodyHtml: '', status: 'sent' });
    const uc = new GetContactMessages(messageRepo({ findByContact: async () => [msg] }));
    const list = await uc.execute(1);
    expect(list).toHaveLength(1);
    expect(list[0].subject).toBe('Hi');
  });
});
