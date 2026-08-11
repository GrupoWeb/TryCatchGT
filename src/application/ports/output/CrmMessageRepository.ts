import { CrmMessage } from '../../../domain/entities/CrmMessage.js';

export interface CrmMessageRepository {
  save(message: CrmMessage): Promise<CrmMessage>;
  findByContact(contactId: number): Promise<CrmMessage[]>;
}
