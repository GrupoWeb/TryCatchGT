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
  mailWebhookSecret: string;
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
      mailWebhookSecret: stored.mailWebhookSecret || '',
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

  // Vista para el panel: nunca serializa los secretos en claro (smtpPass,
  // turnstileSecretKey). En su lugar expone banderas de "configurado" (M2).
  private adminView(c: ResolvedConfig) {
    return {
      contactEmail: c.contactEmail,
      whatsappNumber: c.whatsappNumber,
      whatsappMessage: c.whatsappMessage,
      turnstileEnabled: c.turnstileEnabled,
      turnstileSiteKey: c.turnstileSiteKey,
      turnstileSecretConfigured: c.turnstileSecretKey.length > 0,
      smtpHost: c.smtpHost,
      smtpPort: c.smtpPort,
      smtpUser: c.smtpUser,
      smtpConfigured: c.smtpPass.length > 0,
      smtpFrom: c.smtpFrom,
      smtpSecure: c.smtpSecure,
      // Recepción de correo del CRM (webhook Hostinger). El secreto va enmascarado;
      // la URL se muestra para pegarla en hPanel al registrar el webhook.
      mailWebhookConfigured: c.mailWebhookSecret.length > 0,
      mailWebhookUrl: `${env.appUrl}/api/webhooks/hostinger-mail`,
    };
  }

  // Admin: leer los valores editables. Los secretos van enmascarados (booleanos).
  public adminGet = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({ success: true, data: this.adminView(await this.resolved()) });
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
    // Secretos: solo se reescriben si llega un valor NO vacío. Un campo vacío
    // significa "déjalo como está" (el panel no lo pre-rellena), para no borrar
    // por accidente la clave al guardar el resto de la config (M2).
    if (b.turnstileSecretKey !== undefined && String(b.turnstileSecretKey).trim() !== '') values.turnstileSecretKey = String(b.turnstileSecretKey).trim();
    if (b.smtpHost !== undefined) values.smtpHost = String(b.smtpHost).trim();
    if (b.smtpPort !== undefined) values.smtpPort = String(b.smtpPort).replace(/\D/g, '') || '587';
    if (b.smtpUser !== undefined) values.smtpUser = String(b.smtpUser).trim();
    if (b.smtpPass !== undefined && String(b.smtpPass) !== '') values.smtpPass = String(b.smtpPass);
    if (b.smtpFrom !== undefined) values.smtpFrom = String(b.smtpFrom).trim();
    if (b.smtpSecure !== undefined) values.smtpSecure = b.smtpSecure ? 'true' : 'false';
    // Secreto del webhook de correo entrante: solo se reescribe si llega no vacío.
    if (b.mailWebhookSecret !== undefined && String(b.mailWebhookSecret).trim() !== '') values.mailWebhookSecret = String(b.mailWebhookSecret).trim();
    await this.repo.setMany(values);
    res.status(200).json({ success: true, data: this.adminView(await this.resolved()) });
  };
}
