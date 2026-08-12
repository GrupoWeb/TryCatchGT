import { Contact } from '../../../domain/entities/Contact.js';
import { ContactFilters } from '../output/ContactRepository.js';

export interface ListContactsUseCase {
  execute(filters?: ContactFilters): Promise<Contact[]>;
}
