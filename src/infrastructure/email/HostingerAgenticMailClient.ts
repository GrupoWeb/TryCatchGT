import { InboundMailGateway } from '../../application/ports/output/InboundMailGateway.js';
import { SiteConfigRepository } from '../../application/ports/output/SiteConfigRepository.js';
import { env } from '../../config/env.js';

/**
 * Cliente del API REST de Hostinger Agentic Mail para acusar recibo de un correo
 * entrante ya procesado: lo marca como leído y, si se configuró una carpeta
 * (`HOSTINGER_MAIL_PROCESSED_FOLDER`), lo mueve allí.
 *
 * El token (Bearer) se lee del panel (site_config). La URL base y la carpeta se
 * ajustan por env para poder alinearse al contrato real del proveedor sin cambiar
 * código. El contrato exacto de Agentic Mail no está publicado de forma estable a
 * la fecha; se asume el patrón REST habitual `PATCH {base}/messages/{id}` con
 * `{ seen: true, folder? }`. Si cambia, basta ajustar la URL base o este método.
 *
 * Es best-effort: si no hay token es inerte (devuelve false) y NUNCA lanza, para
 * no convertir un fallo del acuse en un error del webhook (el correo ya se guardó).
 */
export class HostingerAgenticMailClient implements InboundMailGateway {
  constructor(private readonly config: SiteConfigRepository) {}

  public async markProcessed(providerMessageId: string): Promise<boolean> {
    if (!providerMessageId) return false;

    const c = await this.config.getAll();
    const token = c.mailApiToken;
    if (!token) return false; // Inerte hasta que se configure el token en el panel.

    // URL base y carpeta: lo guardado en el panel manda; si no, el default de env.
    const baseUrl = (c.mailApiBaseUrl || env.mailApi.baseUrl).replace(/\/+$/, '');
    const folder = c.mailApiProcessedFolder ?? env.mailApi.processedFolder;
    const url = `${baseUrl}/messages/${encodeURIComponent(providerMessageId)}`;
    const body: Record<string, unknown> = { seen: true };
    if (folder) body.folder = folder;

    // Timeout para no colgar el webhook si el proveedor no responde.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        console.warn(`✉️  Agentic Mail: no se pudo marcar el correo ${providerMessageId} (HTTP ${res.status}).`);
        return false;
      }
      return true;
    } catch (err) {
      console.warn(`✉️  Agentic Mail: error al marcar el correo ${providerMessageId}:`, (err as Error).message);
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  public async fetchFullBody(bodyUrl: string): Promise<string | null> {
    if (!bodyUrl || !/^https?:\/\//i.test(bodyUrl)) return null;

    const c = await this.config.getAll();
    const token = c.mailApiToken;

    // Timeout para no colgar el webhook si la descarga no responde.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(bodyUrl, {
        // El bodyUrl suele ser una URL firmada (no requiere auth), pero se manda el
        // Bearer si está configurado por si el proveedor lo exige. Es inocuo si no.
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal: controller.signal,
      });
      if (!res.ok) {
        console.warn(`✉️  Agentic Mail: no se pudo descargar el cuerpo completo (HTTP ${res.status}).`);
        return null;
      }
      const text = await res.text();
      return text.trim() ? text : null;
    } catch (err) {
      console.warn('✉️  Agentic Mail: error al descargar el cuerpo completo:', (err as Error).message);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
