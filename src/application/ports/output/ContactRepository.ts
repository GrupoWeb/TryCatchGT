import { Contact, ContactStage, ContactTier } from '../../../domain/entities/Contact.js';

export interface ContactFilters {
  stage?: ContactStage;
  tier?: ContactTier;
  sector?: string;
  hasWebsite?: boolean;
  search?: string;
}

/** Campos que el CRM puede editar de un contacto (parche parcial). */
export interface ContactPatch {
  name?: string;
  phone?: string;
  company?: string;
  sector?: string;
  location?: string;
  website?: string;
  tier?: ContactTier | null;
  notes?: string;
  nextActionAt?: Date | null;
}

export interface ContactRepository {
  save(contact: Contact): Promise<Contact>;
  findAll(filters?: ContactFilters): Promise<Contact[]>;
  findById(id: number): Promise<Contact | null>;
  findByEmail(email: string): Promise<Contact | null>;
  updateStage(id: number, stage: ContactStage): Promise<boolean>;
  update(id: number, patch: ContactPatch): Promise<boolean>;
  countByStage(): Promise<Record<string, number>>;
}
