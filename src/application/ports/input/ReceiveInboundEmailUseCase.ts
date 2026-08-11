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
