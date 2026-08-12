import { ContactStage } from '../../../domain/entities/Contact.js';
import { ContactPatch } from '../output/ContactRepository.js';

export interface UpdateContactUseCase {
  changeStage(id: number, stage: ContactStage): Promise<boolean>;
  patch(id: number, patch: ContactPatch): Promise<boolean>;
}
