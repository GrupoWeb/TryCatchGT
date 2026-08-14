import { CrmMessage } from '../../../domain/entities/CrmMessage.js';

/** Fila de la bandeja: correo entrante con datos del contacto para listarlo. */
export interface InboxItem {
  id: number;
  contactId: number;
  contactName: string;
  contactEmail: string;
  subject: string;
  bodyHtml: string;
  // false = el cuerpo está recortado; la bandeja intenta completarlo al abrirlo.
  bodyComplete: boolean;
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
  // Lista los últimos entrantes (excluye los enviados a la papelera) con el
  // nombre/correo del contacto.
  listInbox(limit: number): Promise<InboxItem[]>;
  // No leídos = entrantes con estado 'received' (aún no revisados), sin papelera.
  countUnreadInbound(): Promise<number>;
  // Marca todos los entrantes 'received' como 'read'; devuelve cuántos cambiaron.
  markInboundRead(): Promise<number>;
  // Marca un entrante concreto como leído/no leído; devuelve true si cambió algo.
  setInboundRead(id: number, read: boolean): Promise<boolean>;
  // Papelera: baja lógica de un entrante (deleted_at = ahora). true si se eliminó.
  softDeleteInbound(id: number): Promise<boolean>;
  // Un entrante vigente por id (para recuperar su cuerpo completo). null si no existe.
  findInboxMessageById(id: number): Promise<CrmMessage | null>;
  // Guarda el cuerpo completo ya descargado y lo marca como completo (limpia body_url).
  updateInboundBody(id: number, bodyHtml: string): Promise<boolean>;
}
