import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Mapeo TypeORM de la tabla `services`. Los nombres de columna en snake_case se
 * declaran explícitamente para no depender de convenciones de nombres.
 */
@Entity({ name: 'services' })
export class ServiceEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 50 })
  icon!: string;

  @Column({ type: 'varchar', name: 'accent_color', length: 50, default: '#0066FF' })
  accentColor!: string;

  @Column({ type: 'json', nullable: true })
  tags!: string[] | null;

  @Column({ type: 'boolean', name: 'is_featured', default: false })
  isFeatured!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
