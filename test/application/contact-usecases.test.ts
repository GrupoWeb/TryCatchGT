import { describe, it, expect, vi } from 'vitest';
import { CreateContact } from '../../src/application/use-cases/CreateContact.js';
import { UpdateContact } from '../../src/application/use-cases/UpdateContact.js';
import { ListContacts } from '../../src/application/use-cases/ListContacts.js';
import { Contact } from '../../src/domain/entities/Contact.js';
import { InvalidContactError } from '../../src/domain/exceptions/DomainError.js';
import type { ContactRepository } from '../../src/application/ports/output/ContactRepository.js';

function fakeRepo(overrides: Partial<ContactRepository> = {}): ContactRepository {
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

describe('CreateContact', () => {
  it('guarda un contacto nuevo cuando el email no existe', async () => {
    const save = vi.fn(async (c: Contact) => c);
    const uc = new CreateContact(fakeRepo({ findByEmail: async () => null, save }));
    const c = await uc.execute({ name: 'Nuevo', email: 'nuevo@x.com' });
    expect(c.email.getValue()).toBe('nuevo@x.com');
    expect(save).toHaveBeenCalledOnce();
  });

  it('rechaza email duplicado sin guardar', async () => {
    const save = vi.fn();
    const existing = new Contact({ name: 'Existe', email: 'dup@x.com' });
    const uc = new CreateContact(fakeRepo({ findByEmail: async () => existing, save }));
    await expect(uc.execute({ name: 'Otro', email: 'dup@x.com' })).rejects.toBeInstanceOf(InvalidContactError);
    expect(save).not.toHaveBeenCalled();
  });
});

describe('UpdateContact', () => {
  it('cambia la etapa con un valor válido', async () => {
    const updateStage = vi.fn(async () => true);
    const uc = new UpdateContact(fakeRepo({ updateStage }));
    await expect(uc.changeStage(1, 'reunion')).resolves.toBe(true);
    expect(updateStage).toHaveBeenCalledWith(1, 'reunion');
  });

  it('rechaza una etapa inválida', async () => {
    const updateStage = vi.fn();
    const uc = new UpdateContact(fakeRepo({ updateStage }));
    await expect(uc.changeStage(1, 'volando' as any)).rejects.toBeInstanceOf(InvalidContactError);
    expect(updateStage).not.toHaveBeenCalled();
  });

  it('propaga la baja lógica al repositorio', async () => {
    const update = vi.fn(async () => true);
    const uc = new UpdateContact(fakeRepo({ update }));
    await expect(uc.patch(7, { archived: true })).resolves.toBe(true);
    expect(update).toHaveBeenCalledWith(7, { archived: true });
  });
});

describe('ListContacts', () => {
  it('pasa los filtros al repositorio', async () => {
    const findAll = vi.fn(async () => []);
    const uc = new ListContacts(fakeRepo({ findAll }));
    await uc.execute({ tier: 'alta', hasWebsite: false });
    expect(findAll).toHaveBeenCalledWith({ tier: 'alta', hasWebsite: false });
  });
});
