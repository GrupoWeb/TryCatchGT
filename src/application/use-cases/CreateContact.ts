import { CreateContactUseCase } from '../ports/input/CreateContactUseCase.js';
import { ContactRepository } from '../ports/output/ContactRepository.js';
import { Contact, ContactProps } from '../../domain/entities/Contact.js';
import { InvalidContactError } from '../../domain/exceptions/DomainError.js';

export class CreateContact implements CreateContactUseCase {
  constructor(private readonly contactRepo: ContactRepository) {}

  public async execute(props: ContactProps): Promise<Contact> {
    const contact = new Contact(props);
    // El email es único: si ya existe un contacto con ese correo, no se duplica.
    const existing = await this.contactRepo.findByEmail(contact.email.getValue());
    if (existing) {
      throw new InvalidContactError('Ya existe un contacto con ese correo.');
    }
    return await this.contactRepo.save(contact);
  }
}
