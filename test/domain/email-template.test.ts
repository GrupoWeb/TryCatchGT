import { describe, it, expect } from 'vitest';
import { EmailTemplate } from '../../src/domain/entities/EmailTemplate.js';
import { InvalidEmailTemplateError } from '../../src/domain/exceptions/DomainError.js';

describe('EmailTemplate', () => {
  it('aplica defaults y recorta campos', () => {
    const t = new EmailTemplate({ name: '  Bienvenida ', subject: ' Hola ', bodyHtml: ' <p>Hi</p> ' });
    expect(t.name).toBe('Bienvenida');
    expect(t.subject).toBe('Hola');
    expect(t.bodyHtml).toBe('<p>Hi</p>');
    expect(t.segment).toBe('all');
    expect(t.createdBy).toBeNull();
  });

  it('exige nombre, asunto y cuerpo', () => {
    expect(() => new EmailTemplate({ name: '', subject: 'x', bodyHtml: 'y' })).toThrow(InvalidEmailTemplateError);
    expect(() => new EmailTemplate({ name: 'x', subject: '  ', bodyHtml: 'y' })).toThrow(InvalidEmailTemplateError);
    expect(() => new EmailTemplate({ name: 'x', subject: 'y', bodyHtml: '   ' })).toThrow(InvalidEmailTemplateError);
  });

  it('rechaza un segmento no válido', () => {
    expect(() => new EmailTemplate({ name: 'x', subject: 'y', bodyHtml: 'z', segment: 'vip' as any })).toThrow(
      InvalidEmailTemplateError,
    );
  });

  it('acepta un segmento válido', () => {
    const t = new EmailTemplate({ name: 'x', subject: 'y', bodyHtml: 'z', segment: 'sin-web' });
    expect(t.segment).toBe('sin-web');
  });
});
