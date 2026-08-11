import { Email } from '../value-objects/Email.js';
import { InvalidContactError } from '../exceptions/DomainError.js';

/**
 * Etapas del pipeline comercial. Coinciden con el plan de ventas para que el
 * sistema y el proceso hablen el mismo idioma. Valores sin tildes (seguros como
 * ENUM en la base). Orden = avance del embudo.
 */
export const CONTACT_STAGES = [
  'nuevo',
  'contactado',
  'respondio',
  'reunion',
  'propuesta',
  'ganado',
  'perdido',
  'dormido',
] as const;
export type ContactStage = (typeof CONTACT_STAGES)[number];

/** Prioridad heurística de encaje (importada del listado INTERFER). */
export const CONTACT_TIERS = ['alta', 'media', 'base'] as const;
export type ContactTier = (typeof CONTACT_TIERS)[number];

export interface ContactProps {
  id?: number;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  sector?: string;
  location?: string;
  website?: string;
  source?: string;
  tier?: ContactTier | null;
  stage?: ContactStage;
  ownerId?: number | null;
  notes?: string;
  nextActionAt?: Date | null;
  archived?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Contacto/prospecto del CRM. Un contacto agrupa a una empresa (o persona) con
 * la que trycatch mantiene o busca una relación comercial. El email es el
 * identificador de negocio (se enlaza con los correos entrantes/salientes).
 */
export class Contact {
  public readonly id?: number;
  public readonly name: string;
  public readonly email: Email;
  public readonly phone: string;
  public readonly company: string;
  public readonly sector: string;
  public readonly location: string;
  public readonly website: string;
  public readonly source: string;
  public readonly tier: ContactTier | null;
  public readonly stage: ContactStage;
  public readonly ownerId: number | null;
  public readonly notes: string;
  public readonly nextActionAt: Date | null;
  /** Baja lógica: el contacto se conserva pero queda fuera del pipeline activo. */
  public readonly archived: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: ContactProps) {
    if (!props.name || props.name.trim().length === 0) {
      throw new InvalidContactError('El nombre es obligatorio.');
    }
    if (props.tier && !CONTACT_TIERS.includes(props.tier)) {
      throw new InvalidContactError(`Prioridad '${props.tier}' no válida.`);
    }
    if (props.stage && !CONTACT_STAGES.includes(props.stage)) {
      throw new InvalidContactError(`Etapa '${props.stage}' no válida.`);
    }

    this.id = props.id;
    this.name = props.name.trim();
    this.email = new Email(props.email);
    this.phone = props.phone?.trim() || '';
    this.company = props.company?.trim() || '';
    this.sector = props.sector?.trim() || '';
    this.location = props.location?.trim() || '';
    this.website = props.website?.trim() || '';
    this.source = props.source?.trim() || 'manual';
    this.tier = props.tier ?? null;
    this.stage = props.stage || 'nuevo';
    this.ownerId = props.ownerId ?? null;
    this.notes = props.notes?.trim() || '';
    this.nextActionAt = props.nextActionAt ?? null;
    this.archived = props.archived ?? false;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || this.createdAt;
  }
}
