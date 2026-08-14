/**
 * Resultado de recuperar el cuerpo completo de un entrante:
 * - 'not_found'  : no existe (o está en la papelera).
 * - 'already'    : ya estaba completo; se devuelve tal cual.
 * - 'unavailable': está recortado pero no hay `bodyUrl` (registro viejo / sin URL).
 * - 'failed'     : había URL pero la descarga falló (TTL expirado, red, etc.).
 * - 'updated'    : se descargó y guardó el cuerpo completo.
 */
export interface RefreshInboundBodyResult {
  outcome: 'not_found' | 'already' | 'unavailable' | 'failed' | 'updated';
  bodyHtml: string | null;
}

export interface RefreshInboundBodyUseCase {
  execute(id: number): Promise<RefreshInboundBodyResult>;
}
