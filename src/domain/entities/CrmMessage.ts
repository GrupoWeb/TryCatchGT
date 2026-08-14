import { InvalidCrmMessageError } from '../exceptions/DomainError.js';

/** Sentido del correo respecto a trycatch. 'out' = enviado, 'in' = recibido. */
export const MESSAGE_DIRECTIONS = ['out', 'in'] as const;
export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number];

/**
 * Estado del mensaje. 'sent'/'failed' aplican a los salientes (Fase 2);
 * 'received'/'read' se reservan para los entrantes del webhook (Fase 3). Se
 * incluyen todos aquí para que el esquema no cambie entre fases.
 */
export const MESSAGE_STATUSES = ['sent', 'failed', 'received', 'read'] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export interface CrmMessageProps {
  id?: number;
  contactId: number;
  direction: MessageDirection;
  subject: string;
  bodyHtml: string;
  // URL temporal para descargar el cuerpo completo (entrantes con cuerpo recortado
  // por el webhook). Se conserva solo mientras `bodyComplete` sea false.
  bodyUrl?: string | null;
  // false = el cuerpo guardado está recortado y se puede reintentar la descarga
  // desde `bodyUrl`. true (por defecto) = el cuerpo es el definitivo.
  bodyComplete?: boolean;
  status: MessageStatus;
  messageId?: string | null;
  inReplyTo?: string | null;
  threadId?: string | null;
  templateId?: number | null;
  sentAt?: Date | null;
  receivedAt?: Date | null;
  createdAt?: Date;
}

/**
 * Correo del CRM enlazado a un contacto (timeline de la conversación). Un
 * registro por correo enviado o recibido. `messageId` es el identificador SMTP
 * (Message-ID); permite deduplicar y, en Fase 3, enlazar respuestas por hilo.
 */
export class CrmMessage {
  public readonly id?: number;
  public readonly contactId: number;
  public readonly direction: MessageDirection;
  public readonly subject: string;
  public readonly bodyHtml: string;
  public readonly bodyUrl: string | null;
  public readonly bodyComplete: boolean;
  public readonly status: MessageStatus;
  public readonly messageId: string | null;
  public readonly inReplyTo: string | null;
  public readonly threadId: string | null;
  public readonly templateId: number | null;
  public readonly sentAt: Date | null;
  public readonly receivedAt: Date | null;
  public readonly createdAt: Date;

  constructor(props: CrmMessageProps) {
    if (!props.contactId || props.contactId <= 0) {
      throw new InvalidCrmMessageError('El mensaje debe pertenecer a un contacto.');
    }
    if (!MESSAGE_DIRECTIONS.includes(props.direction)) {
      throw new InvalidCrmMessageError(`Dirección '${props.direction}' no válida.`);
    }
    if (!MESSAGE_STATUSES.includes(props.status)) {
      throw new InvalidCrmMessageError(`Estado '${props.status}' no válido.`);
    }
    if (!props.subject || props.subject.trim().length === 0) {
      throw new InvalidCrmMessageError('El asunto es obligatorio.');
    }

    this.id = props.id;
    this.contactId = props.contactId;
    this.direction = props.direction;
    this.subject = props.subject.trim();
    this.bodyHtml = props.bodyHtml ?? '';
    this.bodyUrl = props.bodyUrl?.trim() || null;
    this.bodyComplete = props.bodyComplete ?? true;
    this.status = props.status;
    this.messageId = props.messageId?.trim() || null;
    this.inReplyTo = props.inReplyTo?.trim() || null;
    this.threadId = props.threadId?.trim() || null;
    this.templateId = props.templateId ?? null;
    this.sentAt = props.sentAt ?? null;
    this.receivedAt = props.receivedAt ?? null;
    this.createdAt = props.createdAt || new Date();
  }
}
