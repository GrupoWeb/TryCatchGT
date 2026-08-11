import {
  InboundEmail,
  ReceiveInboundEmailResult,
  ReceiveInboundEmailUseCase,
} from '../ports/input/ReceiveInboundEmailUseCase.js';
import { ContactRepository } from '../ports/output/ContactRepository.js';
import { CrmMessageRepository } from '../ports/output/CrmMessageRepository.js';
import { CadenceRunRepository } from '../ports/output/CadenceRunRepository.js';
import { HtmlSanitizer } from '../ports/output/HtmlSanitizer.js';
import { Contact } from '../../domain/entities/Contact.js';
import { CrmMessage } from '../../domain/entities/CrmMessage.js';
import { InvalidCrmMessageError } from '../../domain/exceptions/DomainError.js';

/**
 * Registra un correo entrante en el timeline del contacto (Fase 3).
 *
 * - Idempotente: si el `messageId` ya existe, no duplica (los webhooks reintentan).
 * - Si el remitente no está en la cartera, crea el contacto (source 'inbound') para
 *   no perder la correspondencia; el admin puede depurarlo luego.
 * - Sanea el cuerpo HTML (contenido de terceros): frena el XSS almacenado al
 *   renderizar el mensaje en el panel.
 * - Avanza el embudo: si el contacto está en 'nuevo' o 'contactado', pasa a
 *   'respondio' (nos escribió). No retrocede etapas más avanzadas.
 */
export class ReceiveInboundEmail implements ReceiveInboundEmailUseCase {
  constructor(
    private readonly contacts: ContactRepository,
    private readonly messages: CrmMessageRepository,
    private readonly sanitizer: HtmlSanitizer,
    // Opcional (Fase 4): al recibir respuesta, corta las cadencias activas del
    // contacto para no seguir persiguiendo a quien ya contestó.
    private readonly cadenceRuns?: CadenceRunRepository,
  ) {}

  public async execute(email: InboundEmail): Promise<ReceiveInboundEmailResult> {
    const fromEmail = (email.fromEmail || '').trim().toLowerCase();
    if (!fromEmail) {
      throw new InvalidCrmMessageError('El correo entrante no trae remitente.');
    }

    // Deduplicación por Message-ID (el webhook puede reintentar el mismo correo).
    if (email.messageId) {
      const existing = await this.messages.findByMessageId(email.messageId);
      if (existing) return { outcome: 'duplicate', message: existing };
    }

    let contact = await this.contacts.findByEmail(fromEmail);
    let contactCreated = false;
    if (!contact) {
      contact = await this.contacts.save(
        new Contact({
          name: email.fromName?.trim() || fromEmail.split('@')[0],
          email: fromEmail,
          source: 'inbound',
          stage: 'nuevo',
        }),
      );
      contactCreated = true;
    }

    const message = await this.messages.save(
      new CrmMessage({
        contactId: contact.id!,
        direction: 'in',
        subject: email.subject?.trim() || '(sin asunto)',
        bodyHtml: this.sanitizer.sanitize(email.bodyHtml || ''),
        status: 'received',
        messageId: email.messageId ?? null,
        inReplyTo: email.inReplyTo ?? null,
        threadId: email.threadId ?? null,
        receivedAt: email.receivedAt ?? new Date(),
      }),
    );

    // Nos escribió: avanza el embudo desde las etapas iniciales.
    if (contact.stage === 'nuevo' || contact.stage === 'contactado') {
      await this.contacts.updateStage(contact.id!, 'respondio');
    }

    // Y corta cualquier cadencia de seguimiento activa (ya respondió).
    if (this.cadenceRuns) {
      await this.cadenceRuns.stopActiveByContact(contact.id!);
    }

    return { outcome: 'stored', message, contactCreated };
  }
}
