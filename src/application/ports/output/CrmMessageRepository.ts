import { CrmMessage } from '../../../domain/entities/CrmMessage.js';

/** Fila de la bandeja: correo entrante con datos del contacto para listarlo. */
export interface InboxItem {
  id: number;
  contactId: number;
  contactName: string;
  contactEmail: string;
  subject: string;
  receivedAt: Date | null;
  createdAt: Date;
  unread: boolean;
}

export interface CrmMessageRepository {
  save(message: CrmMessage): Promise<CrmMessage>;
  findByContact(contactId: number): Promise<CrmMessage[]>;
  // Idempotencia de la recepción: un webhook puede reintentar el mismo correo.
  findByMessageId(messageId: string): Promise<CrmMessage | null>;
  // ── Bandeja (correos entrantes de todo el CRM) ──
  // Lista los últimos entrantes con el nombre/correo del contacto.
  listInbox(limit: number): Promise<InboxItem[]>;
  // No leídos = entrantes con estado 'received' (aún no revisados).
  countUnreadInbound(): Promise<number>;
  // Marca todos los entrantes 'received' como 'read'; devuelve cuántos cambiaron.
  markInboundRead(): Promise<number>;
}
