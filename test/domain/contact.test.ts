import { describe, it, expect } from 'vitest';
import { Contact } from '../../src/domain/entities/Contact.js';
import { InvalidContactError, InvalidEmailError } from '../../src/domain/exceptions/DomainError.js';

describe('Contact', () => {
  it('aplica defaults seguros y normaliza email', () => {
    const c = new Contact({ name: '  Café Pineda ', email: 'Ventas@CAFE.com' });
    expect(c.name).toBe('Café Pineda');
    expect(c.email.getValue()).toBe('ventas@cafe.com');
    expect(c.stage).toBe('nuevo');
    expect(c.tier).toBeNull();
    expect(c.source).toBe('manual');
    expect(c.ownerId).toBeNull();
  });

  it('exige nombre', () => {
    expect(() => new Contact({ name: '   ', email: 'a@b.com' })).toThrow(InvalidContactError);
  });

  it('rechaza email inválido', () => {
    expect(() => new Contact({ name: 'X', email: 'no-es-email' })).toThrow(InvalidEmailError);
  });

  it('rechaza etapa o prioridad no válidas', () => {
    expect(() => new Contact({ name: 'X', email: 'a@b.com', stage: 'zzz' as any })).toThrow(InvalidContactError);
    expect(() => new Contact({ name: 'X', email: 'a@b.com', tier: 'premium' as any })).toThrow(InvalidContactError);
  });

  it('acepta etapa y prioridad válidas', () => {
    const c = new Contact({ name: 'X', email: 'a@b.com', stage: 'propuesta', tier: 'alta' });
    expect(c.stage).toBe('propuesta');
    expect(c.tier).toBe('alta');
  });
});
