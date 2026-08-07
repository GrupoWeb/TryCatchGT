import sanitizeHtml from 'sanitize-html';

/**
 * Limpia el HTML del editor del blog: conserva formato seguro y elimina
 * <script>, manejadores on*, URLs javascript:, etc. Frena el XSS almacenado.
 */
export function sanitizeBlogHtml(dirty: string): string {
  return sanitizeHtml(dirty || '', {
    allowedTags: ['p', 'br', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote', 'a', 'img'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow', target: '_blank' }),
    },
  });
}
