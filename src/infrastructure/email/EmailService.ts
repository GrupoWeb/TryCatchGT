import nodemailer from 'nodemailer';
import { SiteConfigRepository } from '../../application/ports/output/SiteConfigRepository.js';
import { EmailSender } from '../../application/ports/output/EmailSender.js';
import { env } from '../../config/env.js';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Envío de correo por SMTP (nodemailer). La configuración se lee del panel
 * (site_config). Si no hay SMTP configurado, degrada a "modo dev": registra el
 * correo en el log del servidor en vez de enviarlo, para no bloquear los flujos.
 * Implementa el puerto `EmailSender` para que los use-cases (CRM) no dependan del
 * transporte concreto.
 */
export class EmailService implements EmailSender {
  constructor(private readonly config: SiteConfigRepository) {}

  public async send(msg: EmailMessage): Promise<{ sent: boolean; messageId?: string }> {
    const c = await this.config.getAll();
    const host = c.smtpHost;
    const user = c.smtpUser;
    const pass = c.smtpPass;
    const from = c.smtpFrom || user;
    const port = Number(c.smtpPort) || 587;

    if (!host || !user || !pass) {
      // En producción NO se imprime el cuerpo: contendría enlaces con tokens de
      // verificación/reset en claro (M5). Solo se registra destinatario y asunto.
      if (env.isProduction) {
        console.warn(`✉️  Correo no enviado (SMTP no configurado). Para: ${msg.to} · Asunto: ${msg.subject}`);
      } else {
        console.log(`✉️  [DEV email] Para: ${msg.to}\n   Asunto: ${msg.subject}\n   ${msg.text || msg.html}`);
      }
      return { sent: false };
    }

    const transport = nodemailer.createTransport({
      host,
      port,
      secure: c.smtpSecure === 'true' || port === 465,
      auth: { user, pass },
    });
    const info = await transport.sendMail({ from, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text });
    return { sent: true, messageId: info.messageId };
  }
}
