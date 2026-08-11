import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { MESSAGE_DIRECTIONS, MESSAGE_STATUSES } from '../../../../domain/entities/CrmMessage.js';

export type MessageDirectionDb = (typeof MESSAGE_DIRECTIONS)[number];
export type MessageStatusDb = (typeof MESSAGE_STATUSES)[number];

@Entity({ name: 'crm_messages' })
export class CrmMessageEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'contact_id', type: 'int' })
  contactId!: number;

  @Column({ type: 'enum', enum: MESSAGE_DIRECTIONS })
  direction!: MessageDirectionDb;

  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  @Column({ name: 'body_html', type: 'text', nullable: true })
  bodyHtml!: string | null;

  @Column({ type: 'enum', enum: MESSAGE_STATUSES })
  status!: MessageStatusDb;

  // Message-ID SMTP. Único (permite deduplicar y enlazar respuestas). Nullable:
  // MySQL admite varios NULL bajo un índice único (envíos fallidos sin id).
  @Index({ unique: true })
  @Column({ name: 'message_id', type: 'varchar', length: 255, nullable: true })
  messageId!: string | null;

  @Column({ name: 'in_reply_to', type: 'varchar', length: 255, nullable: true })
  inReplyTo!: string | null;

  @Column({ name: 'thread_id', type: 'varchar', length: 255, nullable: true })
  threadId!: string | null;

  @Column({ name: 'template_id', type: 'int', nullable: true })
  templateId!: number | null;

  @Column({ name: 'sent_at', type: 'datetime', nullable: true })
  sentAt!: Date | null;

  @Column({ name: 'received_at', type: 'datetime', nullable: true })
  receivedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
