import { Response } from 'express';
import { AuthedRequest } from '../middleware/requireAuth.js';
import { SendContactEmail } from '../../../application/use-cases/SendContactEmail.js';
import { GetContactMessages } from '../../../application/use-cases/GetContactMessages.js';
import { CrmMessage } from '../../../domain/entities/CrmMessage.js';
import { DomainError } from '../../../domain/exceptions/DomainError.js';

function toView(m: CrmMessage) {
  return {
    id: m.id,
    contactId: m.contactId,
    direction: m.direction,
    subject: m.subject,
    bodyHtml: m.bodyHtml,
    status: m.status,
    templateId: m.templateId,
    sentAt: m.sentAt,
    receivedAt: m.receivedAt,
    createdAt: m.createdAt,
  };
}

export class CrmMailController {
  constructor(
    private readonly sendContactEmail: SendContactEmail,
    private readonly getContactMessages: GetContactMessages,
  ) {}

  public listMessages = async (req: AuthedRequest, res: Response): Promise<void> => {
    const messages = await this.getContactMessages.execute(Number(req.params.id));
    res.status(200).json({ success: true, data: messages.map(toView) });
  };

  public sendEmail = async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const b = req.body ?? {};
      const result = await this.sendContactEmail.execute({
        contactId: Number(req.params.id),
        templateId: b.templateId ? Number(b.templateId) : null,
        subject: b.subject,
        bodyHtml: b.bodyHtml,
        advanceStage: b.advanceStage === true || b.advanceStage === 'true',
      });
      // 200 aunque `sent` sea false (SMTP sin configurar): el intento quedó
      // registrado en el timeline; el frontend avisa según `sent`.
      res.status(200).json({
        success: true,
        sent: result.sent,
        data: toView(result.message),
      });
    } catch (err) {
      if (err instanceof DomainError) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      throw err;
    }
  };
}
