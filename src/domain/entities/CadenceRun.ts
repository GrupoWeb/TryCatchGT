import { InvalidCadenceError } from '../exceptions/DomainError.js';

/**
 * Estado de la inscripción de un contacto en una cadencia. 'active' = en curso;
 * 'completed' = se enviaron todos los pasos; 'stopped' = cortada (el contacto
 * respondió, o la cadencia se desactivó/borró).
 */
export const CADENCE_RUN_STATUSES = ['active', 'completed', 'stopped'] as const;
export type CadenceRunStatus = (typeof CADENCE_RUN_STATUSES)[number];

export interface CadenceRunProps {
  id?: number;
  cadenceId: number;
  contactId: number;
  currentStep?: number;
  status?: CadenceRunStatus;
  nextRunAt?: Date | null;
  lastSentAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Inscripción de un contacto en una cadencia y su progreso. `currentStep` es el
 * índice (0-based) del PRÓXIMO paso a enviar; `nextRunAt` es cuándo toca enviarlo.
 */
export class CadenceRun {
  public readonly id?: number;
  public readonly cadenceId: number;
  public readonly contactId: number;
  public readonly currentStep: number;
  public readonly status: CadenceRunStatus;
  public readonly nextRunAt: Date | null;
  public readonly lastSentAt: Date | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: CadenceRunProps) {
    if (!props.cadenceId || props.cadenceId <= 0) {
      throw new InvalidCadenceError('La inscripción requiere una cadencia.');
    }
    if (!props.contactId || props.contactId <= 0) {
      throw new InvalidCadenceError('La inscripción requiere un contacto.');
    }
    if (props.status && !CADENCE_RUN_STATUSES.includes(props.status)) {
      throw new InvalidCadenceError(`Estado '${props.status}' no válido.`);
    }
    this.id = props.id;
    this.cadenceId = props.cadenceId;
    this.contactId = props.contactId;
    this.currentStep = props.currentStep ?? 0;
    this.status = props.status || 'active';
    this.nextRunAt = props.nextRunAt ?? null;
    this.lastSentAt = props.lastSentAt ?? null;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || this.createdAt;
  }
}
