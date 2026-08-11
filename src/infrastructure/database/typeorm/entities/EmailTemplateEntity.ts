import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TEMPLATE_SEGMENTS } from '../../../../domain/entities/EmailTemplate.js';

export type TemplateSegmentDb = (typeof TEMPLATE_SEGMENTS)[number];

@Entity({ name: 'crm_templates' })
export class EmailTemplateEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  @Column({ name: 'body_html', type: 'text' })
  bodyHtml!: string;

  @Column({ type: 'enum', enum: TEMPLATE_SEGMENTS, default: 'all' })
  segment!: TemplateSegmentDb;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
