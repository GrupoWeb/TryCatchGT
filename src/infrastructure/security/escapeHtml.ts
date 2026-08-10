/**
 * Escapa un valor para interpolarlo con seguridad dentro de HTML (p. ej. plantillas
 * de correo). Equivalente del servidor al `esc()` del frontend. Frena la inyección
 * de HTML cuando el valor procede de campos que controla el usuario (M6).
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
