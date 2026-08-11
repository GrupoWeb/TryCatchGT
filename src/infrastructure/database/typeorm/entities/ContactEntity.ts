import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { CONTACT_STAGES, CONTACT_TIERS } from '../../../../domain/entities/Contact.js';

export type ContactStageDb = (typeof CONTACT_STAGES)[number];
export type ContactTierDb = (typeof CONTACT_TIERS)[number];

@Entity({ name: 'crm_contacts' })
export class ContactEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  // El email identifica al contacto de negocio y es único: evita duplicados en
  // la importación y permite enlazar los correos entrantes/salientes por remitente.
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 190 })
  email!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  company!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  sector!: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  location!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website!: string | null;

  @Column({ type: 'varchar', length: 60, default: 'manual' })
  source!: string;

  @Column({ type: 'enum', enum: CONTACT_TIERS, nullable: true })
  tier!: ContactTierDb | null;

  @Index()
  @Column({ type: 'enum', enum: CONTACT_STAGES, default: 'nuevo' })
  stage!: ContactStageDb;

  @Column({ name: 'owner_id', type: 'int', nullable: true })
  ownerId!: number | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'next_action_at', type: 'datetime', nullable: true })
  nextActionAt!: Date | null;

  // Baja lógica: se conserva el registro (histórico, correos enlazados) pero se
  // excluye del pipeline activo salvo que se pida explícitamente.
  @Index()
  @Column({ type: 'boolean', default: false })
  archived!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
