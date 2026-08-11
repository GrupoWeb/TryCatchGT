import { CrmMessage } from '../../../domain/entities/CrmMessage.js';

export interface CrmMessageRepository {
  save(message: CrmMessage): Promise<CrmMessage>;
  findByContact(contactId: number): Promise<CrmMessage[]>;
  // Idempotencia de la recepción: un webhook puede reintentar el mismo correo.
  findByMessageId(messageId: string): Promise<CrmMessage | null>;
}
