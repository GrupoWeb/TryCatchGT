export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Puerto de salida para el envío de correo. Desacopla los use-cases del
 * transporte concreto (SMTP/nodemailer en `infrastructure/email/EmailService`).
 * `sent: false` indica que no se envió (p. ej. SMTP sin configurar en dev).
 */
export interface EmailSender {
  send(msg: OutgoingEmail): Promise<{ sent: boolean; messageId?: string }>;
}
