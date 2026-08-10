import { escapeHtml } from '../security/escapeHtml.js';

export interface EmailTemplateData {
  // Encabezado/preheader del mensaje (texto de vista previa en la bandeja).
  title: string;
  // Saludo, p. ej. "Hola Juan". Se escapa (puede venir del perfil del usuario).
  greeting: string;
  // Párrafo principal.
  intro: string;
  // Botón de acción.
  ctaLabel: string;
  ctaUrl: string;
  // Nota al pie opcional (vigencia del enlace, aviso de "si no lo pediste…").
  note?: string;
}

/**
 * Plantilla HTML de correo con la marca TryCatch GT. Pensada para clientes de
 * correo reales: layout con tablas, estilos en línea, sin CSS externo ni fuentes
 * remotas (Gmail/Outlook los ignoran). Todos los valores interpolados se escapan
 * aquí, así que quien llama pasa texto plano.
 */
export function renderEmail(data: EmailTemplateData): string {
  const title = escapeHtml(data.title);
  const greeting = escapeHtml(data.greeting);
  const intro = escapeHtml(data.intro);
  const ctaLabel = escapeHtml(data.ctaLabel);
  const ctaUrl = escapeHtml(data.ctaUrl);
  const note = data.note ? escapeHtml(data.note) : '';
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
        <tr><td style="padding:32px;">
          <p style="margin:0 0 14px;font-size:16px;color:#15151a;">${greeting}</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3a3a42;">${intro}</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:linear-gradient(90deg,#8b5cf6,#ec4899);">
            <a href="${ctaUrl}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${ctaLabel}</a>
          </td></tr></table>
          ${note ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#8a8a93;">${note}</p>` : ''}
          <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#a0a0a8;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br><span style="color:#8b5cf6;word-break:break-all;">${ctaUrl}</span></p>
        </td></tr>
        <tr><td style="padding:18px 32px;background:#fafafa;border-top:1px solid #eeeef2;">
          <p style="margin:0;font-size:12px;color:#9a9aa2;">© ${year} TryCatch GT · Este es un correo automático, no respondas a este mensaje.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
