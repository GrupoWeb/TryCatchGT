import { Contact, ContactProps } from '../../../domain/entities/Contact.js';

export interface CreateContactUseCase {
  execute(props: ContactProps): Promise<Contact>;
}
