import { Email } from '../value-objects/Email.js';
import { InvalidProjectRequestError } from '../exceptions/DomainError.js';

export type ProjectRequestStatus = 'pending' | 'reviewed' | 'contacted';

export interface ProjectRequestProps {
  id?: number;
  clientName: string;
  clientEmail: string;
  companyName?: string;
  projectType: string;
  budgetRange?: string;
  description: string;
  status?: ProjectRequestStatus;
  createdAt?: Date;
}

export class ProjectRequest {
  public readonly id?: number;
  public readonly clientName: string;
  public readonly clientEmail: Email;
  public readonly companyName: string;
  public readonly projectType: string;
  public readonly budgetRange: string;
  public readonly description: string;
  public readonly status: 'pending' | 'reviewed' | 'contacted';
  public readonly createdAt: Date;

  constructor(props: ProjectRequestProps) {
    if (!props.clientName || props.clientName.trim().length === 0) {
      throw new InvalidProjectRequestError('El nombre del cliente es obligatorio.');
    }
    if (!props.description || props.description.trim().length < 10) {
      throw new InvalidProjectRequestError('La descripción del proyecto debe tener al menos 10 caracteres.');
    }

    this.id = props.id;
    this.clientName = props.clientName.trim();
    this.clientEmail = new Email(props.clientEmail);
    this.companyName = props.companyName?.trim() || '';
    this.projectType = props.projectType || 'Custom Software';
    this.budgetRange = props.budgetRange || 'Unspecified';
    this.description = props.description.trim();
    this.status = props.status || 'pending';
    this.createdAt = props.createdAt || new Date();
  }
}
