import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Imagen subida (avatar, portada del blog) almacenada en la BD en vez de en disco.
 * En hostings con deploy inmutable + CDN (p. ej. Hostinger) los archivos escritos
 * en tiempo de ejecución no se sirven ni sobreviven al redeploy; guardarlos en la
 * BD los hace persistentes y servibles por una ruta de la app.
 */
@Entity({ name: 'media' })
export class MediaEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'varchar', length: 32 })
  mime!: string;

  @Column({ type: 'int' })
  size!: number;

  // MEDIUMBLOB: hasta 16 MB, holgado para el límite de subida de 4 MB.
  @Column({ type: 'mediumblob' })
  data!: Buffer;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
