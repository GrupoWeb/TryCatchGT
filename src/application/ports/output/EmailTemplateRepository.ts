import { EmailTemplate, TemplateSegment } from '../../../domain/entities/EmailTemplate.js';

export interface EmailTemplateFilters {
  segment?: TemplateSegment;
}

export interface EmailTemplateRepository {
  save(template: EmailTemplate): Promise<EmailTemplate>;
  update(id: number, template: EmailTemplate): Promise<EmailTemplate | null>;
  findAll(filters?: EmailTemplateFilters): Promise<EmailTemplate[]>;
  findById(id: number): Promise<EmailTemplate | null>;
  delete(id: number): Promise<boolean>;
}
