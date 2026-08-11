import { EmailTemplate, TemplateSegment } from '../../../domain/entities/EmailTemplate.js';

export interface SaveEmailTemplateInput {
  id?: number;
  name: string;
  subject: string;
  bodyHtml: string;
  segment?: TemplateSegment;
  createdBy?: number | null;
}

export interface SaveEmailTemplateUseCase {
  execute(input: SaveEmailTemplateInput): Promise<EmailTemplate>;
}
