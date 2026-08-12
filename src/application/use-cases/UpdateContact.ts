import { UpdateContactUseCase } from '../ports/input/UpdateContactUseCase.js';
import { ContactPatch, ContactRepository } from '../ports/output/ContactRepository.js';
import { CONTACT_STAGES, ContactStage } from '../../domain/entities/Contact.js';
import { InvalidContactError } from '../../domain/exceptions/DomainError.js';

export class UpdateContact implements UpdateContactUseCase {
  constructor(private readonly contactRepo: ContactRepository) {}

  public async changeStage(id: number, stage: ContactStage): Promise<boolean> {
    if (!CONTACT_STAGES.includes(stage)) {
      throw new InvalidContactError(`Etapa '${stage}' no válida.`);
    }
    return await this.contactRepo.updateStage(id, stage);
  }

  public async patch(id: number, patch: ContactPatch): Promise<boolean> {
    return await this.contactRepo.update(id, patch);
  }
}
