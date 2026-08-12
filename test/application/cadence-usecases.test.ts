import { describe, it, expect, vi } from 'vitest';
import { EnrollContactInCadence } from '../../src/application/use-cases/EnrollContactInCadence.js';
import { ProcessDueCadences } from '../../src/application/use-cases/ProcessDueCadences.js';
import type { SendContactEmail } from '../../src/application/use-cases/SendContactEmail.js';
import { Contact } from '../../src/domain/entities/Contact.js';
import { Cadence } from '../../src/domain/entities/Cadence.js';
import { CadenceRun } from '../../src/domain/entities/CadenceRun.js';
import { InvalidCadenceError, InvalidContactError } from '../../src/domain/exceptions/DomainError.js';
import type { ContactRepository } from '../../src/application/ports/output/ContactRepository.js';
import type { CadenceRepository } from '../../src/application/ports/output/CadenceRepository.js';
import type { CadenceRunRepository } from '../../src/application/ports/output/CadenceRunRepository.js';

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
function cadenceRepo(overrides: Partial<CadenceRepository> = {}): CadenceRepository {
  return {
    save: async (c) => c,
    update: async (_id, c) => c,
    findAll: async () => [],
    findById: async () => null,
    delete: async () => true,
    ...overrides,
  };
}
function runRepo(overrides: Partial<CadenceRunRepository> = {}): CadenceRunRepository {
  return {
    save: async (r) => r,
    findDue: async () => [],
    findByContact: async () => [],
    findActive: async () => null,
    stopActiveByContact: async () => 0,
    ...overrides,
  };
}
function sender(sent = true): SendContactEmail {
  return { execute: vi.fn(async () => ({ sent, message: {} as never })) } as unknown as SendContactEmail;
}

const ana = new Contact({ id: 1, name: 'Ana', email: 'ana@x.com', stage: 'contactado' });
const cadence = new Cadence({ id: 7, name: 'Seg', steps: [{ delayDays: 0, templateId: 10 }, { delayDays: 3, templateId: 11 }] });

describe('EnrollContactInCadence', () => {
  it('inscribe y programa el primer paso', async () => {
    const save = vi.fn(async (r: CadenceRun) => r);
    const uc = new EnrollContactInCadence(
      contactRepo({ findById: async () => ana }),
      cadenceRepo({ findById: async () => cadence }),
      runRepo({ save }),
    );
    const run = await uc.execute({ contactId: 1, cadenceId: 7 });
    expect(run.currentStep).toBe(0);
    expect(run.status).toBe('active');
    expect(run.nextRunAt).toBeInstanceOf(Date);
    expect(save).toHaveBeenCalledOnce();
  });

  it('rechaza si el contacto no existe', async () => {
    const uc = new EnrollContactInCadence(contactRepo(), cadenceRepo({ findById: async () => cadence }), runRepo());
    await expect(uc.execute({ contactId: 9, cadenceId: 7 })).rejects.toBeInstanceOf(InvalidContactError);
  });

  it('rechaza cadencia inactiva', async () => {
    const inactive = new Cadence({ id: 7, name: 'Seg', isActive: false, steps: [{ delayDays: 0, templateId: 10 }] });
    const uc = new EnrollContactInCadence(contactRepo({ findById: async () => ana }), cadenceRepo({ findById: async () => inactive }), runRepo());
    await expect(uc.execute({ contactId: 1, cadenceId: 7 })).rejects.toBeInstanceOf(InvalidCadenceError);
  });

  it('rechaza inscripción duplicada activa', async () => {
    const existing = new CadenceRun({ id: 3, cadenceId: 7, contactId: 1 });
    const uc = new EnrollContactInCadence(
      contactRepo({ findById: async () => ana }),
      cadenceRepo({ findById: async () => cadence }),
      runRepo({ findActive: async () => existing }),
    );
    await expect(uc.execute({ contactId: 1, cadenceId: 7 })).rejects.toBeInstanceOf(InvalidCadenceError);
  });
});

describe('ProcessDueCadences', () => {
  it('envía el paso actual y reprograma el siguiente', async () => {
    const due = new CadenceRun({ id: 5, cadenceId: 7, contactId: 1, currentStep: 0, nextRunAt: new Date(0) });
    const save = vi.fn(async (r: CadenceRun) => r);
    const send = sender(true);
    const uc = new ProcessDueCadences(
      runRepo({ findDue: async () => [due], save }),
      cadenceRepo({ findById: async () => cadence }),
      send,
    );
    const res = await uc.execute(new Date());
    expect(res).toMatchObject({ processed: 1, sent: 1, completed: 0, stopped: 0 });
    expect((send.execute as any)).toHaveBeenCalledWith(expect.objectContaining({ contactId: 1, templateId: 10 }));
    const saved = save.mock.calls[0][0] as CadenceRun;
    expect(saved.currentStep).toBe(1);
    expect(saved.status).toBe('active');
    expect(saved.nextRunAt).toBeInstanceOf(Date);
  });

  it('completa la inscripción tras el último paso', async () => {
    const due = new CadenceRun({ id: 5, cadenceId: 7, contactId: 1, currentStep: 1, nextRunAt: new Date(0) });
    const save = vi.fn(async (r: CadenceRun) => r);
    const uc = new ProcessDueCadences(runRepo({ findDue: async () => [due], save }), cadenceRepo({ findById: async () => cadence }), sender(true));
    const res = await uc.execute(new Date());
    expect(res).toMatchObject({ processed: 1, sent: 1, completed: 1 });
    expect((save.mock.calls[0][0] as CadenceRun).status).toBe('completed');
    expect((save.mock.calls[0][0] as CadenceRun).nextRunAt).toBeNull();
  });

  it('corta la inscripción si la cadencia está inactiva o borrada', async () => {
    const due = new CadenceRun({ id: 5, cadenceId: 7, contactId: 1, currentStep: 0, nextRunAt: new Date(0) });
    const save = vi.fn(async (r: CadenceRun) => r);
    const send = sender(true);
    const uc = new ProcessDueCadences(runRepo({ findDue: async () => [due], save }), cadenceRepo({ findById: async () => null }), send);
    const res = await uc.execute(new Date());
    expect(res).toMatchObject({ processed: 1, stopped: 1, sent: 0 });
    expect((save.mock.calls[0][0] as CadenceRun).status).toBe('stopped');
    expect((send.execute as any)).not.toHaveBeenCalled();
  });
});
