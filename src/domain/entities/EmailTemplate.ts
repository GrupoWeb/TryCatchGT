import { InvalidEmailTemplateError } from '../exceptions/DomainError.js';

/**
 * Segmento al que aplica una plantilla. Sirve para agrupar/filtrar plantillas en
 * el panel (p. ej. "solo prospectos sin sitio web"). 'all' = cualquier contacto.
 * Reutiliza las prioridades del pipeline (alta/media/base) del catálogo INTERFER.
 */
export const TEMPLATE_SEGMENTS = ['all', 'alta', 'media', 'base', 'sin-web'] as const;
export type TemplateSegment = (typeof TEMPLATE_SEGMENTS)[number];

export interface EmailTemplateProps {
  id?: number;
  name: string;
  subject: string;
  bodyHtml: string;
  segment?: TemplateSegment;
  createdBy?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Plantilla de correo del CRM. Guarda un asunto y un cuerpo HTML con variables
 * ({nombre}, {empresa}, {sector}, {ubicacion}, {sitio}) que se sustituyen por los
 * datos del contacto al enviar. El cuerpo se sanea al persistir (misma lista
 * blanca que el blog): frena el XSS almacenado.
 */
export class EmailTemplate {
  public readonly id?: number;
  public readonly name: string;
  public readonly subject: string;
  public readonly bodyHtml: string;
  public readonly segment: TemplateSegment;
  public readonly createdBy: number | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: EmailTemplateProps) {
    if (!props.name || props.name.trim().length === 0) {
      throw new InvalidEmailTemplateError('El nombre es obligatorio.');
    }
    if (!props.subject || props.subject.trim().length === 0) {
      throw new InvalidEmailTemplateError('El asunto es obligatorio.');
    }
    if (!props.bodyHtml || props.bodyHtml.trim().length === 0) {
      throw new InvalidEmailTemplateError('El cuerpo del mensaje es obligatorio.');
    }
    if (props.segment && !TEMPLATE_SEGMENTS.includes(props.segment)) {
      throw new InvalidEmailTemplateError(`Segmento '${props.segment}' no válido.`);
    }

    this.id = props.id;
    this.name = props.name.trim();
    this.subject = props.subject.trim();
    this.bodyHtml = props.bodyHtml.trim();
    this.segment = props.segment || 'all';
    this.createdBy = props.createdBy ?? null;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || this.createdAt;
  }
}
