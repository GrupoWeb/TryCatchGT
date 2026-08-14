import { Request, Response } from 'express';
import { CrmMessageRepository } from '../../../application/ports/output/CrmMessageRepository.js';
import { RefreshInboundBodyUseCase } from '../../../application/ports/input/RefreshInboundBodyUseCase.js';

/**
 * Bandeja del CRM: reúne los correos entrantes de todos los contactos en un solo
 * lugar para ver rápido quién respondió, sin entrar contacto por contacto. El
 * "no leído" se apoya en el estado del mensaje ('received' = sin revisar); al
 * abrir la bandeja se marcan como 'read' y el badge se limpia.
 */
export class CrmInboxController {
  constructor(
    private readonly messages: CrmMessageRepository,
    // Recuperación diferida del cuerpo completo (correos recortados por el webhook).
    private readonly refreshBodyUseCase: RefreshInboundBodyUseCase,
  ) {}

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

  /** Marca un correo concreto como leído/no leído (body: { read: boolean }). */
  public setRead = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, error: 'Id no válido.' });
      return;
    }
    const read = req.body?.read !== false; // por defecto marca como leído
    const ok = await this.messages.setInboundRead(id, read);
    if (!ok) {
      res.status(404).json({ success: false, error: 'Correo no encontrado.' });
      return;
    }
    res.status(200).json({ success: true, data: { id, read } });
  };

  /** Envía un correo a la papelera (baja lógica; se conserva en la BD). */
  public remove = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, error: 'Id no válido.' });
      return;
    }
    const ok = await this.messages.softDeleteInbound(id);
    if (!ok) {
      res.status(404).json({ success: false, error: 'Correo no encontrado.' });
      return;
    }
    res.status(200).json({ success: true, data: { id } });
  };

  /**
   * Recupera el cuerpo completo de un correo recortado por el webhook (descarga
   * diferida desde el `bodyUrl` guardado). Se llama al abrir el correo en la bandeja.
   * Devuelve siempre el cuerpo a mostrar (el completo si se logró, o el actual).
   */
  public refreshBody = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, error: 'Id no válido.' });
      return;
    }
    const result = await this.refreshBodyUseCase.execute(id);
    if (result.outcome === 'not_found') {
      res.status(404).json({ success: false, error: 'Correo no encontrado.' });
      return;
    }
    res.status(200).json({
      success: true,
      data: { id, outcome: result.outcome, bodyHtml: result.bodyHtml, complete: result.outcome !== 'failed' && result.outcome !== 'unavailable' },
    });
  };
}
