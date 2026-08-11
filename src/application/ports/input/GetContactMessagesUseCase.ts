import { CrmMessage } from '../../../domain/entities/CrmMessage.js';

export interface GetContactMessagesUseCase {
  execute(contactId: number): Promise<CrmMessage[]>;
}
