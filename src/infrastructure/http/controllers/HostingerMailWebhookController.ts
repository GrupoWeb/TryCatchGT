import { Request, Response } from 'express';
import crypto from 'node:crypto';
import { ReceiveInboundEmail } from '../../../application/use-cases/ReceiveInboundEmail.js';
import { InboundEmail } from '../../../application/ports/input/ReceiveInboundEmailUseCase.js';
import { SiteConfigRepository } from '../../../application/ports/output/SiteConfigRepository.js';
import { DomainError } from '../../../domain/exceptions/DomainError.js';

/** Extrae la dirección de un campo "from" que puede venir de varias formas. */
function extractAddress(from: unknown): { email: string; name?: string } | null {
  if (!from) return null;
  if (typeof from === 'object') {
    const o = from as Record<string, unknown>;
    const email = (o.address || o.email || o.value) as string | undefined;
    const name = (o.name || o.displayName) as string | undefined;
    if (email && typeof email === 'string') return { email: email.trim(), name: name?.trim() };
    return null;
  }
  if (typeof from === 'string') {
    // "Nombre <correo@dominio>" o "correo@dominio".
    const m = from.match(/<([^>]+)>/);
    if (m) {
      const name = from.slice(0, from.indexOf('<')).trim().replace(/^"|"$/g, '');
      return { email: m[1].trim(), name: name || undefined };
    }
    const bare = from.trim();
    return bare.includes('@') ? { email: bare } : null;
  }
  return null;
}

function firstString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

/**
 * Normaliza el payload del webhook `message.received` de Hostinger Agentic Mail a
 * un `InboundEmail`. Es defensivo con la forma exacta (acepta varios alias de
 * campo) porque el contrato puede variar. Devuelve `null` si no logra extraer el
 * remitente (sin él no se puede enlazar el correo a un contacto).
 */
export function parseInboundPayload(body: unknown): InboundEmail | null {
  if (!body || typeof body !== 'object') return null;
  const root = body as Record<string, unknown>;
  const data = (root.data as Record<string, unknown>) || root;
  const msg = ((data.message as Record<string, unknown>) || (data.email as Record<string, unknown>) || data) as Record<string, unknown>;

  const from = extractAddress(msg.from ?? msg.sender ?? msg.fromAddress);
  if (!from) return null;

  const references = msg.references;
  const threadId = firstString(
    msg.thread_id,
    msg.threadId,
    Array.isArray(references) ? (references[0] as string) : (references as string),
  );
  const dateRaw = firstString(msg.date, msg.received_at, msg.receivedAt, msg.timestamp);
  const receivedAt = dateRaw ? new Date(dateRaw) : null;

  return {
    fromEmail: from.email,
    fromName: from.name,
    subject: firstString(msg.subject),
    bodyHtml: firstString(msg.html, msg.body_html, msg.bodyHtml, msg.body, msg.text),
    messageId: firstString(msg.message_id, msg.messageId, msg.id) ?? null,
    inReplyTo: firstString(msg.in_reply_to, msg.inReplyTo) ?? null,
    threadId: threadId ?? null,
    receivedAt: receivedAt && !isNaN(receivedAt.getTime()) ? receivedAt : null,
  };
}

/** Comparación en tiempo constante de dos secretos (evita timing attacks). */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export class HostingerMailWebhookController {
  constructor(
    private readonly receiveInbound: ReceiveInboundEmail,
    private readonly config: SiteConfigRepository,
  ) {}

  /**
   * Endpoint del webhook (POST /api/webhooks/hostinger-mail). Sin sesión: se
   * autentica con un secreto compartido (header `X-Webhook-Secret` o query `token`)
   * que el admin configura en el panel y registra en hPanel al crear el webhook.
   * Responde 200 aunque el correo sea duplicado, para que Hostinger no reintente.
   */
  public receive = async (req: Request, res: Response): Promise<void> => {
    const c = await this.config.getAll();
    const secret = c.mailWebhookSecret;
    // Fail-closed: sin secreto configurado no se acepta nada (evita un endpoint
    // abierto que cualquiera pueda usar para inyectar correos/contactos).
    if (!secret) {
      res.status(503).json({ success: false, error: 'Webhook no configurado.' });
      return;
    }

    const headerRaw = req.headers['x-webhook-secret'];
    const provided =
      (Array.isArray(headerRaw) ? headerRaw[0] : headerRaw) ||
      (typeof req.query.token === 'string' ? req.query.token : '');
    if (!provided || !safeEqual(provided, secret)) {
      res.status(401).json({ success: false, error: 'No autorizado.' });
      return;
    }

    const inbound = parseInboundPayload(req.body);
    if (!inbound) {
      res.status(400).json({ success: false, error: 'Payload no reconocido (sin remitente).' });
      return;
    }

    try {
      const result = await this.receiveInbound.execute(inbound);
      res.status(200).json({ success: true, outcome: result.outcome });
    } catch (err) {
      if (err instanceof DomainError) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      throw err;
    }
  };
}
