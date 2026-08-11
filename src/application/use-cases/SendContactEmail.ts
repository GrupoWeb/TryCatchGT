import {
  SendContactEmailInput,
  SendContactEmailResult,
  SendContactEmailUseCase,
} from '../ports/input/SendContactEmailUseCase.js';
import { ContactRepository } from '../ports/output/ContactRepository.js';
import { EmailTemplateRepository } from '../ports/output/EmailTemplateRepository.js';
import { CrmMessageRepository } from '../ports/output/CrmMessageRepository.js';
import { EmailSender } from '../ports/output/EmailSender.js';
import { HtmlSanitizer } from '../ports/output/HtmlSanitizer.js';
import { CrmMessage } from '../../domain/entities/CrmMessage.js';
import { renderTemplate } from '../../domain/services/renderTemplate.js';
import {
  InvalidContactError,
  InvalidCrmMessageError,
} from '../../domain/exceptions/DomainError.js';

/**
 * Envía un correo a un contacto y lo registra en su timeline (crm_messages).
 *
 * El asunto/cuerpo pueden venir de una plantilla guardada o escritos a mano; en
 * ambos casos se sustituyen las variables ({nombre}, {empresa}, …) con los datos
 * del contacto y el cuerpo se sanea (lista blanca del blog). Si el envío tiene
 * éxito y el contacto sigue en 'nuevo', opcionalmente se avanza a 'contactado'.
 *
 * El registro se guarda tanto si el envío sale (status 'sent') como si falla o no
 * hay SMTP configurado (status 'failed'): así el historial refleja el intento.
 */
export class SendContactEmail implements SendContactEmailUseCase {
  constructor(
    private readonly contacts: ContactRepository,
    private readonly templates: EmailTemplateRepository,
    private readonly messages: CrmMessageRepository,
    private readonly emailSender: EmailSender,
    private readonly sanitizer: HtmlSanitizer,
  ) {}

  public async execute(input: SendContactEmailInput): Promise<SendContactEmailResult> {
    const contact = await this.contacts.findById(input.contactId);
    if (!contact) {
      throw new InvalidContactError('El contacto no existe.');
    }

    // La plantilla (si se indica) aporta el asunto/cuerpo por defecto; lo escrito
    // a mano tiene prioridad para permitir ajustes puntuales sobre la plantilla.
    let templateId: number | null = null;
    let subject = input.subject?.trim() || '';
    let bodyHtml = input.bodyHtml || '';

    if (input.templateId) {
      const template = await this.templates.findById(input.templateId);
      if (!template) {
        throw new InvalidCrmMessageError('La plantilla indicada no existe.');
      }
      templateId = template.id ?? null;
      if (!subject) subject = template.subject;
      if (!bodyHtml.trim()) bodyHtml = template.bodyHtml;
    }

    if (!subject || !bodyHtml.trim()) {
      throw new InvalidCrmMessageError('Indica una plantilla o bien un asunto y un cuerpo.');
    }

    const cleanBody = this.sanitizer.sanitize(bodyHtml);
    const rendered = renderTemplate(subject, cleanBody, contact);

    const { sent, messageId } = await this.emailSender.send({
      to: contact.email.getValue(),
      subject: rendered.subject,
      html: rendered.bodyHtml,
    });

    const message = await this.messages.save(
      new CrmMessage({
        contactId: contact.id!,
        direction: 'out',
        subject: rendered.subject,
        bodyHtml: rendered.bodyHtml,
        status: sent ? 'sent' : 'failed',
        messageId: messageId ?? null,
        templateId,
        sentAt: sent ? new Date() : null,
      }),
    );

    // Avanza el embudo solo desde 'nuevo': no retrocede etapas más avanzadas.
    if (sent && input.advanceStage && contact.stage === 'nuevo') {
      await this.contacts.updateStage(contact.id!, 'contactado');
    }

    return { message, sent };
  }
}
