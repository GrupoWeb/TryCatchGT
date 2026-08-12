import { CrmMessageRepository, InboxItem } from '../../../application/ports/output/CrmMessageRepository.js';
import { CrmMessage } from '../../../domain/entities/CrmMessage.js';
import { AppDataSource } from './data-source.js';
import { CrmMessageEntity } from './entities/CrmMessageEntity.js';
import { ContactEntity } from './entities/ContactEntity.js';

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

  public async listInbox(limit: number): Promise<InboxItem[]> {
    const rows = await this.repo
      .createQueryBuilder('m')
      .innerJoin(ContactEntity, 'c', 'c.id = m.contactId')
      .select('m.id', 'id')
      .addSelect('m.contactId', 'contactId')
      .addSelect('m.subject', 'subject')
      .addSelect('m.bodyHtml', 'bodyHtml')
      .addSelect('m.status', 'status')
      .addSelect('m.receivedAt', 'receivedAt')
      .addSelect('m.createdAt', 'createdAt')
      .addSelect('c.name', 'contactName')
      .addSelect('c.email', 'contactEmail')
      .where('m.direction = :dir', { dir: 'in' })
      .orderBy('m.createdAt', 'DESC')
      .limit(limit)
      .getRawMany<{
        id: number; contactId: number; subject: string; bodyHtml: string | null; status: string;
        receivedAt: Date | null; createdAt: Date; contactName: string; contactEmail: string;
      }>();
    return rows.map((r) => ({
      id: Number(r.id),
      contactId: Number(r.contactId),
      contactName: r.contactName,
      contactEmail: r.contactEmail,
      subject: r.subject,
      bodyHtml: r.bodyHtml ?? '',
      receivedAt: r.receivedAt ? new Date(r.receivedAt) : null,
      createdAt: new Date(r.createdAt),
      unread: r.status === 'received',
    }));
  }

  public async countUnreadInbound(): Promise<number> {
    return this.repo.count({ where: { direction: 'in', status: 'received' } });
  }

  public async markInboundRead(): Promise<number> {
    const result = await this.repo.update({ direction: 'in', status: 'received' }, { status: 'read' });
    return result.affected ?? 0;
  }
}
