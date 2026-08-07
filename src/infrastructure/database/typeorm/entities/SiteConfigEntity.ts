import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'site_config' })
export class SiteConfigEntity {
  @PrimaryColumn({ name: 'config_key', type: 'varchar', length: 80 })
  configKey!: string;

  @Column({ name: 'config_value', type: 'text', nullable: true })
  configValue!: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
