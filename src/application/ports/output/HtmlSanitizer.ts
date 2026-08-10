/**
 * Puerto de salida para sanear HTML de contenido enriquecido (artículos del blog).
 * La implementación vive en `infrastructure/` (sanitize-html); la capa de aplicación
 * solo depende de esta interfaz, sin importar nada de infraestructura.
 */
export interface HtmlSanitizer {
  sanitize(dirty: string): string;
}
