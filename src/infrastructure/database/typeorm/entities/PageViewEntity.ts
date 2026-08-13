import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ name: 'page_views' })
export class PageViewEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  path!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  referrer!: string | null;

  // Código ISO de país (2 letras) tomado de la cabecera CF-IPCountry de Cloudflare.
  @Column({ type: 'varchar', length: 2, nullable: true })
  country!: string | null;

  // desktop | mobile | tablet (los bots no se registran).
  @Column({ type: 'varchar', length: 16, nullable: true })
  device!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  browser!: string | null;

  @Index()
  @Column({ name: 'visitor_hash', type: 'varchar', length: 64, nullable: true })
  visitorHash!: string | null;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}