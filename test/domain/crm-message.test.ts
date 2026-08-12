import { describe, it, expect } from 'vitest';
import { CrmMessage } from '../../src/domain/entities/CrmMessage.js';
import { InvalidCrmMessageError } from '../../src/domain/exceptions/DomainError.js';

describe('CrmMessage', () => {
  it('crea un mensaje saliente válido con defaults', () => {
    const m = new CrmMessage({ contactId: 5, direction: 'out', subject: 'Hola', bodyHtml: '<p>Hi</p>', status: 'sent' });
    expect(m.contactId).toBe(5);
    expect(m.direction).toBe('out');
    expect(m.status).toBe('sent');
    expect(m.messageId).toBeNull();
    expect(m.templateId).toBeNull();
    expect(m.sentAt).toBeNull();
  });

  it('exige un contacto', () => {
    expect(() => new CrmMessage({ contactId: 0, direction: 'out', subject: 'x', bodyHtml: '', status: 'sent' })).toThrow(
      InvalidCrmMessageError,
    );
  });

  it('rechaza dirección o estado no válidos', () => {
    expect(() => new CrmMessage({ contactId: 1, direction: 'side' as any, subject: 'x', bodyHtml: '', status: 'sent' })).toThrow(
      InvalidCrmMessageError,
    );
    expect(() => new CrmMessage({ contactId: 1, direction: 'out', subject: 'x', bodyHtml: '', status: 'nope' as any })).toThrow(
      InvalidCrmMessageError,
    );
  });

  it('exige asunto', () => {
    expect(() => new CrmMessage({ contactId: 1, direction: 'out', subject: '  ', bodyHtml: '', status: 'sent' })).toThrow(
      InvalidCrmMessageError,
    );
  });
});
