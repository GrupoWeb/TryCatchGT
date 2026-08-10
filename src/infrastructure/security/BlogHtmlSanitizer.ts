import { HtmlSanitizer } from '../../application/ports/output/HtmlSanitizer.js';
import { sanitizeBlogHtml } from './sanitize.js';

/**
 * Adaptador del puerto HtmlSanitizer: delega en `sanitizeBlogHtml` (sanitize-html
 * con la lista blanca de etiquetas del editor del blog).
 */
export class BlogHtmlSanitizer implements HtmlSanitizer {
  public sanitize(dirty: string): string {
    return sanitizeBlogHtml(dirty);
  }
}
