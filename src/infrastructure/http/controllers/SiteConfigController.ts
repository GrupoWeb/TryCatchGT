import { Request, Response } from 'express';
import { SiteConfigRepository } from '../../../application/ports/output/SiteConfigRepository.js';
import { env } from '../../../config/env.js';

interface ResolvedConfig {
  contactEmail: string;
  whatsappNumber: string;
  whatsappMessage: string;
  turnstileEnabled: boolean;
  turnstileSiteKey: string;
  turnstileSecretKey: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  smtpSecure: boolean;
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
      turnstileEnabled: stored.turnstileEnabled === 'true',
      turnstileSiteKey: stored.turnstileSiteKey || '',
      turnstileSecretKey: stored.turnstileSecretKey || '',
      smtpHost: stored.smtpHost || '',
      smtpPort: stored.smtpPort || '587',
      smtpUser: stored.smtpUser || '',
      smtpPass: stored.smtpPass || '',
      smtpFrom: stored.smtpFrom || '',
      smtpSecure: stored.smtpSecure === 'true',
    };
  }

  // Público: usado por el footer / botón de WhatsApp y para renderizar Turnstile.
  // Nunca expone la secret key.
  public publicConfig = async (_req: Request, res: Response): Promise<void> => {
    const c = await this.resolved();
    res.status(200).json({
      success: true,
      data: {
        contactEmail: c.contactEmail,
        whatsappNumber: c.whatsappNumber,
        whatsappLink: `https://wa.me/${c.whatsappNumber}?text=${encodeURIComponent(c.whatsappMessage)}`,
        turnstileEnabled: c.turnstileEnabled,
        turnstileSiteKey: c.turnstileSiteKey,
      },
    });
  };

  // Admin: leer los valores editables (incluye la secret key, detrás de auth).
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
    if (b.turnstileEnabled !== undefined) values.turnstileEnabled = b.turnstileEnabled ? 'true' : 'false';
    if (b.turnstileSiteKey !== undefined) values.turnstileSiteKey = String(b.turnstileSiteKey).trim();
    if (b.turnstileSecretKey !== undefined) values.turnstileSecretKey = String(b.turnstileSecretKey).trim();
    if (b.smtpHost !== undefined) values.smtpHost = String(b.smtpHost).trim();
    if (b.smtpPort !== undefined) values.smtpPort = String(b.smtpPort).replace(/\D/g, '') || '587';
    if (b.smtpUser !== undefined) values.smtpUser = String(b.smtpUser).trim();
    if (b.smtpPass !== undefined) values.smtpPass = String(b.smtpPass);
    if (b.smtpFrom !== undefined) values.smtpFrom = String(b.smtpFrom).trim();
    if (b.smtpSecure !== undefined) values.smtpSecure = b.smtpSecure ? 'true' : 'false';
    await this.repo.setMany(values);
    res.status(200).json({ success: true, data: await this.resolved() });
  };
}
