import { CrmMessageRepository } from '../../../application/ports/output/CrmMessageRepository.js';
import { CrmMessage } from '../../../domain/entities/CrmMessage.js';
import { AppDataSource } from './data-source.js';
import { CrmMessageEntity } from './entities/CrmMessageEntity.js';

function toDomain(e: CrmMessageEntity): CrmMessage {
  return new CrmMessage({
    id: e.id,
    contactId: e.contactId,
    direction: e.direction,
    subject: e.subject,
    bodyHtml: e.bodyHtml ?? '',
    status: e.status,
    messageId: e.messageId,
    inReplyTo: e.inReplyTo,
    threadId: e.threadId,
    templateId: e.templateId,
    sentAt: e.sentAt,
    receivedAt: e.receivedAt,
    createdAt: e.createdAt,
  });
}

export class TypeOrmCrmMessageRepository implements CrmMessageRepository {
  private get repo() {
    return AppDataSource.getRepository(CrmMessageEntity);
  }

  public async save(message: CrmMessage): Promise<CrmMessage> {
    const entity = this.repo.create({
      contactId: message.contactId,
      direction: message.direction,
      subject: message.subject,
      bodyHtml: message.bodyHtml || null,
      status: message.status,
      messageId: message.messageId,
      inReplyTo: message.inReplyTo,
      threadId: message.threadId,
      templateId: message.templateId,
      sentAt: message.sentAt,
      receivedAt: message.receivedAt,
    });
    return toDomain(await this.repo.save(entity));
  }

  public async findByContact(contactId: number): Promise<CrmMessage[]> {
    const rows = await this.repo.find({
      where: { contactId },
      order: { createdAt: 'DESC' },
    });
    return rows.map(toDomain);
  }

  public async findByMessageId(messageId: string): Promise<CrmMessage | null> {
    const row = await this.repo.findOne({ where: { messageId } });
    return row ? toDomain(row) : null;
  }
}
