import {
  SaveEmailTemplateInput,
  SaveEmailTemplateUseCase,
} from '../ports/input/SaveEmailTemplateUseCase.js';
import { EmailTemplateRepository } from '../ports/output/EmailTemplateRepository.js';
import { HtmlSanitizer } from '../ports/output/HtmlSanitizer.js';
import { EmailTemplate } from '../../domain/entities/EmailTemplate.js';
import { InvalidEmailTemplateError } from '../../domain/exceptions/DomainError.js';

/**
 * Crea o actualiza una plantilla de correo. El cuerpo HTML se sanea con la misma
 * lista blanca del blog antes de persistir (frena el XSS almacenado). El dominio
 * valida los campos obligatorios y el segmento.
 */
export class SaveEmailTemplate implements SaveEmailTemplateUseCase {
  constructor(
    private readonly repo: EmailTemplateRepository,
    private readonly sanitizer: HtmlSanitizer,
  ) {}

  public async execute(input: SaveEmailTemplateInput): Promise<EmailTemplate> {
    const template = new EmailTemplate({
      id: input.id,
      name: input.name,
      subject: input.subject,
      bodyHtml: this.sanitizer.sanitize(input.bodyHtml || ''),
      segment: input.segment,
      createdBy: input.createdBy ?? null,
    });

    if (input.id) {
      const updated = await this.repo.update(input.id, template);
      if (!updated) {
        throw new InvalidEmailTemplateError('La plantilla no existe.');
      }
      return updated;
    }
    return await this.repo.save(template);
  }
}
