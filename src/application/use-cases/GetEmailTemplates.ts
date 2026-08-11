import { GetEmailTemplatesUseCase } from '../ports/input/GetEmailTemplatesUseCase.js';
import {
  EmailTemplateFilters,
  EmailTemplateRepository,
} from '../ports/output/EmailTemplateRepository.js';
import { EmailTemplate } from '../../domain/entities/EmailTemplate.js';

export class GetEmailTemplates implements GetEmailTemplatesUseCase {
  constructor(private readonly repo: EmailTemplateRepository) {}

  public async execute(filters?: EmailTemplateFilters): Promise<EmailTemplate[]> {
    return await this.repo.findAll(filters);
  }
}
