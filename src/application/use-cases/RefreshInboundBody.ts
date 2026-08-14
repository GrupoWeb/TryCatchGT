import {
  RefreshInboundBodyResult,
  RefreshInboundBodyUseCase,
} from '../ports/input/RefreshInboundBodyUseCase.js';
import { CrmMessageRepository } from '../ports/output/CrmMessageRepository.js';
import { InboundMailGateway } from '../ports/output/InboundMailGateway.js';
import { HtmlSanitizer } from '../ports/output/HtmlSanitizer.js';

/**
 * Recupera el cuerpo completo de un correo entrante cuyo cuerpo quedó recortado por
 * el webhook (bodyComplete === false). Descarga desde el `bodyUrl` guardado (URL
 * temporal), sanea el HTML (contenido de terceros → anti-XSS) y lo persiste,
 * marcando el correo como completo. Es idempotente: si ya está completo, no hace nada.
 *
 * Se dispara al abrir el correo en la bandeja. Best-effort: si el `bodyUrl` expiró
 * (TTL) la descarga falla y se conserva el recorte; el correo se puede revisar en
 * la bandeja del proveedor.
 */
export class RefreshInboundBody implements RefreshInboundBodyUseCase {
  constructor(
    private readonly messages: CrmMessageRepository,
    private readonly gateway: InboundMailGateway,
    private readonly sanitizer: HtmlSanitizer,
  ) {}

  public async execute(id: number): Promise<RefreshInboundBodyResult> {
    const message = await this.messages.findInboxMessageById(id);
    if (!message) return { outcome: 'not_found', bodyHtml: null };
    if (message.bodyComplete) return { outcome: 'already', bodyHtml: message.bodyHtml };
    if (!message.bodyUrl) return { outcome: 'unavailable', bodyHtml: message.bodyHtml };

    const full = await this.gateway.fetchFullBody(message.bodyUrl);
    if (!full) return { outcome: 'failed', bodyHtml: message.bodyHtml };

    const sanitized = this.sanitizer.sanitize(full);
    await this.messages.updateInboundBody(id, sanitized);
    return { outcome: 'updated', bodyHtml: sanitized };
  }
}
