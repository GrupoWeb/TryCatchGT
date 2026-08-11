import { CrmMessage } from '../../../domain/entities/CrmMessage.js';

/** Correo entrante ya normalizado desde el payload del webhook. */
export interface InboundEmail {
  fromEmail: string;
  fromName?: string;
  subject?: string;
  bodyHtml?: string;
  messageId?: string | null;
  inReplyTo?: string | null;
  threadId?: string | null;
  receivedAt?: Date | null;
  // Id interno del proveedor (Agentic Mail) para acusar recibo vía su API REST
  // (marcar leído/mover). Distinto del Message-ID RFC (`messageId`). No lo usa el
  // dominio: lo consume el webhook controller tras registrar el correo.
  providerId?: string | null;
}

export interface ReceiveInboundEmailResult {
  // 'stored' = registrado; 'duplicate' = ya existía (webhook reintentado).
  outcome: 'stored' | 'duplicate';
  message?: CrmMessage;
  contactCreated?: boolean;
}

export interface ReceiveInboundEmailUseCase {
  execute(email: InboundEmail): Promise<ReceiveInboundEmailResult>;
}
