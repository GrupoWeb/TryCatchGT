import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { CADENCE_RUN_STATUSES } from '../../../../domain/entities/CadenceRun.js';

export type CadenceRunStatusDb = (typeof CADENCE_RUN_STATUSES)[number];

@Entity({ name: 'crm_cadence_runs' })
// Índice de apoyo para buscar la inscripción de un par cadencia/contacto. NO es
// único: un contacto puede reinscribirse tras completar o detener una ejecución
// (queda historial). El duplicado ACTIVO lo evita EnrollContactInCadence.findActive.
@Index(['cadenceId', 'contactId'])
export class CadenceRunEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'cadence_id', type: 'int' })
  cadenceId!: number;

  @Index()
  @Column({ name: 'contact_id', type: 'int' })
  contactId!: number;

  @Column({ name: 'current_step', type: 'int', default: 0 })
  currentStep!: number;

  @Index()
  @Column({ type: 'enum', enum: CADENCE_RUN_STATUSES, default: 'active' })
  status!: CadenceRunStatusDb;

  @Index()
  @Column({ name: 'next_run_at', type: 'datetime', nullable: true })
  nextRunAt!: Date | null;

  @Column({ name: 'last_sent_at', type: 'datetime', nullable: true })
  lastSentAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
