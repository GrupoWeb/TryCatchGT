import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export type BlogStatusDb = 'draft' | 'published';

// Las marcas de tiempo las gestiona el dominio (BlogPost), por eso son columnas
// planas que se escriben explícitamente y no @CreateDateColumn/@UpdateDateColumn.
@Entity({ name: 'blog_posts' })
export class BlogPostEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 160, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  excerpt!: string | null;

  @Column({ type: 'mediumtext' })
  content!: string;

  @Column({ type: 'varchar', length: 100, default: 'General' })
  category!: string;

  @Column({ type: 'varchar', length: 150, default: 'TryCatch GT' })
  author!: string;

  @Column({ name: 'cover_image', type: 'varchar', length: 500, nullable: true })
  coverImage!: string | null;

  @Column({ name: 'cover_position', type: 'varchar', length: 20, default: '50% 50%' })
  coverPosition!: string;

  @Column({ name: 'reading_time', type: 'int', default: 1 })
  readingTime!: number;

  @Column({ type: 'enum', enum: ['draft', 'published'], default: 'draft' })
  status!: BlogStatusDb;

  @Column({ name: 'published_at', type: 'datetime', nullable: true })
  publishedAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
