import { Contact } from '../entities/Contact.js';

/**
 * Variables admitidas en asunto y cuerpo de las plantillas. Se escriben entre
 * llaves, p. ej. "Hola {nombre}, vi que {empresa} aún no tiene sitio…".
 */
export const TEMPLATE_VARIABLES = ['nombre', 'empresa', 'sector', 'ubicacion', 'sitio'] as const;
export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

/** Escape mínimo para interpolar texto del contacto dentro del HTML del cuerpo. */
function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function valuesFor(contact: Contact): Record<TemplateVariable, string> {
  return {
    nombre: contact.name,
    empresa: contact.company || contact.name,
    sector: contact.sector,
    ubicacion: contact.location,
    sitio: contact.website,
  };
}

/**
 * Sustituye las variables {…} por los datos del contacto. `escapeValues` escapa
 * los valores para el cuerpo HTML (evita romper el marcado); en el asunto (texto
 * plano) va en false. Las variables desconocidas se dejan intactas.
 */
function apply(template: string, values: Record<string, string>, escapeValues: boolean): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (!(key in values)) return match;
    const raw = values[key] ?? '';
    return escapeValues ? escape(raw) : raw;
  });
}

export interface RenderedTemplate {
  subject: string;
  bodyHtml: string;
}

/**
 * Renderiza una plantilla para un contacto concreto: sustituye las variables en
 * el asunto (texto plano) y en el cuerpo (HTML, con los valores escapados).
 */
export function renderTemplate(
  subject: string,
  bodyHtml: string,
  contact: Contact,
): RenderedTemplate {
  const values = valuesFor(contact);
  return {
    subject: apply(subject, values, false),
    bodyHtml: apply(bodyHtml, values, true),
  };
}
