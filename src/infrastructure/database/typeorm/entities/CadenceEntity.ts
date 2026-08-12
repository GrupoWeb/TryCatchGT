import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Cadencia de seguimiento. Los pasos se guardan como JSON en `steps_json`
 * (array de {delayDays, templateId}): son parte del agregado y se editan como una
 * unidad, así que no ameritan una tabla aparte.
 */
@Entity({ name: 'crm_cadences' })
export class CadenceEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'steps_json', type: 'text' })
  stepsJson!: string;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
