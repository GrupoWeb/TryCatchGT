import { DeleteEmailTemplateUseCase } from '../ports/input/DeleteEmailTemplateUseCase.js';
import { EmailTemplateRepository } from '../ports/output/EmailTemplateRepository.js';

export class DeleteEmailTemplate implements DeleteEmailTemplateUseCase {
  constructor(private readonly repo: EmailTemplateRepository) {}

  public async execute(id: number): Promise<boolean> {
    return await this.repo.delete(id);
  }
}
