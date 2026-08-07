import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type ProjectRequestStatusDb = 'pending' | 'reviewed' | 'contacted';

@Entity({ name: 'project_requests' })
export class ProjectRequestEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'client_name', type: 'varchar', length: 150 })
  clientName!: string;

  @Column({ name: 'client_email', type: 'varchar', length: 150 })
  clientEmail!: string;

  @Column({ name: 'company_name', type: 'varchar', length: 150, nullable: true })
  companyName!: string | null;

  @Column({ name: 'project_type', type: 'varchar', length: 100, default: 'Custom Software' })
  projectType!: string;

  @Column({ name: 'budget_range', type: 'varchar', length: 50, nullable: true })
  budgetRange!: string | null;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'enum', enum: ['pending', 'reviewed', 'contacted'], default: 'pending' })
  status!: ProjectRequestStatusDb;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
