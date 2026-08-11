import { ListContactsUseCase } from '../ports/input/ListContactsUseCase.js';
import { ContactFilters, ContactRepository } from '../ports/output/ContactRepository.js';
import { Contact } from '../../domain/entities/Contact.js';

export class ListContacts implements ListContactsUseCase {
  constructor(private readonly contactRepo: ContactRepository) {}

  public async execute(filters?: ContactFilters): Promise<Contact[]> {
    return await this.contactRepo.findAll(filters);
  }
}
