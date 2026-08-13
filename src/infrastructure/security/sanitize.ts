import sanitizeHtml from 'sanitize-html';

/**
 * Limpia el HTML del editor del blog: conserva formato seguro y elimina
 * <script>, manejadores on*, URLs javascript:, etc. Frena el XSS almacenado.
 */
export function sanitizeBlogHtml(dirty: string): string {
  return sanitizeHtml(dirty || '', {
    allowedTags: ['p', 'br', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'span'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width'],
      // Solo color de texto (para dar formato a los correos). El valor se valida
      // con allowedStyles: cualquier otra propiedad o valor no permitido se descarta.
      span: ['style'],
      p: ['style'],
    },
    allowedStyles: {
      '*': {
        color: [/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/],
        // Alineación (del párrafo que envuelve una imagen o del texto). Email-safe.
        'text-align': [/^(?:left|right|center|justify)$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow', target: '_blank' }),
    },
  });
}
