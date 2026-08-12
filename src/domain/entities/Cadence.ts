import { InvalidCadenceError } from '../exceptions/DomainError.js';

export interface CadenceStepProps {
  // Días a esperar antes de enviar este paso: para el paso 0 se cuenta desde la
  // inscripción; para los siguientes, desde el envío del paso anterior.
  delayDays: number;
  templateId: number;
}

/** Un paso de la secuencia: cuándo enviar (delay) y qué plantilla usar. */
export class CadenceStep {
  public readonly delayDays: number;
  public readonly templateId: number;

  constructor(p: CadenceStepProps) {
    if (!Number.isInteger(p.delayDays) || p.delayDays < 0) {
      throw new InvalidCadenceError('El retraso de un paso debe ser un número de días ≥ 0.');
    }
    if (!Number.isInteger(p.templateId) || p.templateId <= 0) {
      throw new InvalidCadenceError('Cada paso debe apuntar a una plantilla.');
    }
    this.delayDays = p.delayDays;
    this.templateId = p.templateId;
  }
}

export interface CadenceProps {
  id?: number;
  name: string;
  isActive?: boolean;
  steps: CadenceStepProps[];
  createdBy?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Cadencia de seguimiento: una secuencia ordenada de correos (pasos) que se
 * envían automáticamente a un contacto con retrasos configurables, hasta que
 * responde o se acaban los pasos. Los pasos son parte del agregado Cadence.
 */
export class Cadence {
  public readonly id?: number;
  public readonly name: string;
  public readonly isActive: boolean;
  public readonly steps: CadenceStep[];
  public readonly createdBy: number | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: CadenceProps) {
    if (!props.name || props.name.trim().length === 0) {
      throw new InvalidCadenceError('El nombre es obligatorio.');
    }
    if (!Array.isArray(props.steps) || props.steps.length === 0) {
      throw new InvalidCadenceError('La cadencia necesita al menos un paso.');
    }
    this.id = props.id;
    this.name = props.name.trim();
    this.isActive = props.isActive ?? true;
    this.steps = props.steps.map((s) => new CadenceStep(s));
    this.createdBy = props.createdBy ?? null;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || this.createdAt;
  }
}
