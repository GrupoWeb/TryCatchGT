import { Request, Response } from 'express';
import { SiteConfigRepository } from '../../../application/ports/output/SiteConfigRepository.js';
import { env } from '../../../config/env.js';

interface ResolvedConfig {
  contactEmail: string;
  whatsappNumber: string;
  whatsappMessage: string;
}

export class SiteConfigController {
  constructor(private readonly repo: SiteConfigRepository) {}

  /** Valores efectivos: lo guardado en BD sobreescribe los defaults del .env. */
  private async resolved(): Promise<ResolvedConfig> {
    const stored = await this.repo.getAll();
    return {
      contactEmail: stored.contactEmail || env.contact.email,
      whatsappNumber: (stored.whatsappNumber || env.contact.whatsapp).replace(/\D/g, ''),
      whatsappMessage: stored.whatsappMessage || env.contact.whatsappMessage,
    };
  }

  // Público: usado por el footer / botón de WhatsApp.
  public publicConfig = async (_req: Request, res: Response): Promise<void> => {
    const c = await this.resolved();
    res.status(200).json({
      success: true,
      data: {
        contactEmail: c.contactEmail,
        whatsappNumber: c.whatsappNumber,
        whatsappLink: `https://wa.me/${c.whatsappNumber}?text=${encodeURIComponent(c.whatsappMessage)}`,
      },
    });
  };

  // Admin: leer los valores editables.
  public adminGet = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({ success: true, data: await this.resolved() });
  };

  // Admin: guardar cambios.
  public adminUpdate = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    const values: Record<string, string> = {};
    if (b.contactEmail !== undefined) values.contactEmail = String(b.contactEmail).trim();
    if (b.whatsappNumber !== undefined) values.whatsappNumber = String(b.whatsappNumber).replace(/\D/g, '');
    if (b.whatsappMessage !== undefined) values.whatsappMessage = String(b.whatsappMessage).trim();
    await this.repo.setMany(values);
    res.status(200).json({ success: true, data: await this.resolved() });
  };
}
