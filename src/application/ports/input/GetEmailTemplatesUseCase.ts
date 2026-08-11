import { EmailTemplate } from '../../../domain/entities/EmailTemplate.js';
import { EmailTemplateFilters } from '../output/EmailTemplateRepository.js';

export interface GetEmailTemplatesUseCase {
  execute(filters?: EmailTemplateFilters): Promise<EmailTemplate[]>;
}
