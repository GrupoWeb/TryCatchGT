import { Request, Response } from 'express';
import { CrmMessageRepository } from '../../../application/ports/output/CrmMessageRepository.js';

/**
 * Bandeja del CRM: reúne los correos entrantes de todos los contactos en un solo
 * lugar para ver rápido quién respondió, sin entrar contacto por contacto. El
 * "no leído" se apoya en el estado del mensaje ('received' = sin revisar); al
 * abrir la bandeja se marcan como 'read' y el badge se limpia.
 */
export class CrmInboxController {
  constructor(private readonly messages: CrmMessageRepository) {}

  public list = async (_req: Request, res: Response): Promise<void> => {
    const [items, unread] = await Promise.all([
      this.messages.listInbox(30),
      this.messages.countUnreadInbound(),
    ]);
    res.status(200).json({ success: true, data: { items, unread } });
  };

  public markSeen = async (_req: Request, res: Response): Promise<void> => {
    const marked = await this.messages.markInboundRead();
    res.status(200).json({ success: true, data: { marked } });
  };
}
