import { describe, it, expect } from 'vitest';
import { Cadence } from '../../src/domain/entities/Cadence.js';
import { CadenceRun } from '../../src/domain/entities/CadenceRun.js';
import { InvalidCadenceError } from '../../src/domain/exceptions/DomainError.js';

describe('Cadence', () => {
  it('crea una cadencia con pasos válidos', () => {
    const c = new Cadence({ name: '  Seguimiento ', steps: [{ delayDays: 0, templateId: 1 }, { delayDays: 3, templateId: 2 }] });
    expect(c.name).toBe('Seguimiento');
    expect(c.isActive).toBe(true);
    expect(c.steps).toHaveLength(2);
    expect(c.steps[1].delayDays).toBe(3);
  });

  it('exige nombre y al menos un paso', () => {
    expect(() => new Cadence({ name: '', steps: [{ delayDays: 0, templateId: 1 }] })).toThrow(InvalidCadenceError);
    expect(() => new Cadence({ name: 'X', steps: [] })).toThrow(InvalidCadenceError);
  });

  it('rechaza pasos con delay negativo o sin plantilla', () => {
    expect(() => new Cadence({ name: 'X', steps: [{ delayDays: -1, templateId: 1 }] })).toThrow(InvalidCadenceError);
    expect(() => new Cadence({ name: 'X', steps: [{ delayDays: 0, templateId: 0 }] })).toThrow(InvalidCadenceError);
  });
});

describe('CadenceRun', () => {
  it('aplica defaults (paso 0, activa)', () => {
    const r = new CadenceRun({ cadenceId: 1, contactId: 2 });
    expect(r.currentStep).toBe(0);
    expect(r.status).toBe('active');
    expect(r.nextRunAt).toBeNull();
  });

  it('exige cadencia y contacto', () => {
    expect(() => new CadenceRun({ cadenceId: 0, contactId: 2 })).toThrow(InvalidCadenceError);
    expect(() => new CadenceRun({ cadenceId: 1, contactId: 0 })).toThrow(InvalidCadenceError);
  });
});
