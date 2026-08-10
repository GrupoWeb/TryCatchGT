/**
 * Contenido por defecto de las páginas legales (el mismo que traen las páginas
 * públicas). Se sirve cuando el admin aún no ha editado la página. Solo usa las
 * etiquetas permitidas por el sanitizador del blog (h2, p, etc.).
 */
export const LEGAL_DEFAULTS: Record<'terminos' | 'privacidad' | 'cookies', string> = {
  terminos: [
    '<h2>1. Objeto</h2>',
    '<p>Estos términos regulan el uso del sitio web de TryCatch GT y la relación entre el visitante y el estudio.</p>',
    '<h2>2. Uso del sitio</h2>',
    '<p>El contenido se ofrece con fines informativos. Te comprometes a usar el sitio de forma lícita y a no realizar acciones que puedan dañar su funcionamiento o seguridad.</p>',
    '<h2>3. Propiedad intelectual</h2>',
    '<p>Los textos, marcas, logos y demás materiales del sitio pertenecen a TryCatch GT o a sus titulares y no pueden reproducirse sin autorización.</p>',
    '<h2>4. Servicios y cotizaciones</h2>',
    '<p>Las cotizaciones enviadas a través del sitio son propuestas iniciales no vinculantes hasta la firma de un acuerdo específico entre las partes.</p>',
    '<h2>5. Responsabilidad</h2>',
    '<p>El sitio se ofrece "tal cual". No garantizamos disponibilidad ininterrumpida ni ausencia total de errores.</p>',
    '<h2>6. Ley aplicable</h2>',
    '<p>Estos términos se rigen por las leyes de la República de Guatemala.</p>',
  ].join(''),
  privacidad: [
    '<h2>1. Responsable</h2>',
    '<p>TryCatch GT (Guatemala) es responsable del tratamiento de los datos personales recabados a través de este sitio.</p>',
    '<h2>2. Datos que recopilamos</h2>',
    '<p>Recopilamos los datos que nos proporcionas voluntariamente al enviar el formulario de cotización (nombre, correo electrónico, empresa y descripción del proyecto), así como datos técnicos básicos de navegación.</p>',
    '<h2>3. Finalidad</h2>',
    '<p>Usamos tus datos para responder a tus solicitudes, elaborar propuestas y darte seguimiento comercial. No vendemos ni cedemos tus datos a terceros con fines publicitarios.</p>',
    '<h2>4. Conservación</h2>',
    '<p>Conservamos tus datos el tiempo necesario para atender tu solicitud y cumplir obligaciones legales aplicables.</p>',
    '<h2>5. Tus derechos</h2>',
    '<p>Puedes solicitar el acceso, rectificación o eliminación de tus datos escribiéndonos al correo de contacto que aparece en el pie de página.</p>',
    '<h2>6. Contacto</h2>',
    '<p>Para cualquier consulta sobre esta política, contáctanos por los medios indicados en el footer del sitio.</p>',
  ].join(''),
  cookies: [
    '<h2>1. ¿Qué son las cookies?</h2>',
    '<p>Las cookies son pequeños archivos que un sitio guarda en tu navegador para recordar información entre visitas.</p>',
    '<h2>2. Cookies que utilizamos</h2>',
    '<p>Este sitio utiliza almacenamiento local del navegador para recordar tu preferencia de moneda (Q / $) y una cookie técnica de sesión únicamente en el panel administrativo. No utilizamos cookies publicitarias ni de rastreo de terceros.</p>',
    '<h2>3. Cómo gestionarlas</h2>',
    '<p>Puedes borrar o bloquear las cookies desde la configuración de tu navegador. Ten en cuenta que deshabilitarlas puede afectar algunas funciones del sitio.</p>',
  ].join(''),
};

export const LEGAL_SLUGS = ['terminos', 'privacidad', 'cookies'] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];
export function isLegalSlug(s: string): s is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(s);
}
