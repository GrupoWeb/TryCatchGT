import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

const decimalToNumber = { from: (v: string | null): number => (v === null ? 0 : Number(v)), to: (v: number): number => v };

@Entity({ name: 'plans' })
export class PlanEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  tagline!: string;

  @Column({ name: 'price_monthly', type: 'decimal', precision: 10, scale: 2, transformer: decimalToNumber })
  priceMonthly!: number;

  @Column({ name: 'price_monthly_gtq', type: 'decimal', precision: 10, scale: 2, transformer: decimalToNumber })
  priceMonthlyGtq!: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency!: string;

  @Column({ type: 'json', nullable: true })
  features!: string[] | null;

  @Column({ type: 'json', nullable: true })
  services!: string[] | null;

  @Column({ name: 'accent_color', type: 'varchar', length: 50, default: '#8B5CF6' })
  accentColor!: string;

  @Column({ name: 'cta_label', type: 'varchar', length: 100, default: 'Elegir plan' })
  ctaLabel!: string;

  @Column({ name: 'is_popular', type: 'boolean', default: false })
  isPopular!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
