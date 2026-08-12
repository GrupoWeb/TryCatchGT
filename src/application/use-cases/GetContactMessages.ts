import { GetContactMessagesUseCase } from '../ports/input/GetContactMessagesUseCase.js';
import { CrmMessageRepository } from '../ports/output/CrmMessageRepository.js';
import { CrmMessage } from '../../domain/entities/CrmMessage.js';

export class GetContactMessages implements GetContactMessagesUseCase {
  constructor(private readonly messages: CrmMessageRepository) {}

  public async execute(contactId: number): Promise<CrmMessage[]> {
    return await this.messages.findByContact(contactId);
  }
}
