/**
 * Escapa un valor para interpolarlo con seguridad dentro de HTML. Se usa solo
 * para el asunto (que alimenta el <title>/preheader): el cuerpo llega ya saneado.
 */
function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Envuelve el cuerpo (HTML ya saneado y con variables sustituidas) de un correo
 * saliente del CRM en la carcasa con la marca TryCatch GT: cabecera negra, franja
 * degradada y pie, con estilos en línea y layout de tablas para clientes reales
 * (Gmail/Outlook ignoran CSS externo y fuentes remotas). Así los correos del CRM
 * llegan con formato y no como texto suelto.
 *
 * `bodyHtml` NO se escapa (es HTML confiable, ya pasó por el saneador de la lista
 * blanca del blog). `subject` sí, porque va como texto en el <title>/preheader. El
 * pie NO dice "no respondas": estos correos sí esperan respuesta del contacto.
 */
export function wrapCrmEmail(bodyHtml: string, subject: string): string {
  const title = escape(subject || 'TryCatch GT');
  const year = new Date().getFullYear();

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f7;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${title}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e6ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="background:#0a0a0c;padding:22px 32px;">
          <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:.2px;">⚡ TryCatch&nbsp;GT</span>
          <span style="font-size:12px;color:#b8b8c0;"> · Ingeniería de Software</span>
        </td></tr>
        <tr><td style="height:4px;background:linear-gradient(90deg,#8b5cf6,#ec4899);font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:32px;font-size:15px;line-height:1.6;color:#3a3a42;">${bodyHtml}</td></tr>
        <tr><td style="padding:18px 32px;background:#fafafa;border-top:1px solid #eeeef2;">
          <p style="margin:0;font-size:12px;color:#9a9aa2;">© ${year} TryCatch GT · Ingeniería de Software · Guatemala</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Deriva una versión en texto plano del cuerpo HTML para el `text` del correo
 * (clientes sin HTML y mejor entregabilidad). Convierte los saltos de bloque en
 * saltos de línea, quita el resto de etiquetas y decodifica las entidades básicas.
 */
export function htmlToPlainText(html: string): string {
  return (html || '')
    .replace(/<\s*(br|\/p|\/h[1-6]|\/li|\/blockquote)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
