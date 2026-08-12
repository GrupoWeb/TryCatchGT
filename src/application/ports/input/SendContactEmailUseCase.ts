import { CrmMessage } from '../../../domain/entities/CrmMessage.js';

export interface SendContactEmailInput {
  contactId: number;
  // Enviar desde una plantilla guardada…
  templateId?: number | null;
  // …o con asunto/cuerpo escritos a mano (tienen prioridad si se envían ambos).
  subject?: string;
  bodyHtml?: string;
  // Si el contacto está en 'nuevo', avanzarlo a 'contactado' tras enviar.
  advanceStage?: boolean;
}

export interface SendContactEmailResult {
  message: CrmMessage;
  sent: boolean;
}

export interface SendContactEmailUseCase {
  execute(input: SendContactEmailInput): Promise<SendContactEmailResult>;
}
