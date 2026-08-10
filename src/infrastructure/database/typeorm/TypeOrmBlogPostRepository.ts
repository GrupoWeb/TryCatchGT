import { BlogPostRepository } from '../../../application/ports/output/BlogPostRepository.js';
import { BlogPost } from '../../../domain/entities/BlogPost.js';
import { AppDataSource } from './data-source.js';
import { BlogPostEntity } from './entities/BlogPostEntity.js';

function toDomain(e: BlogPostEntity): BlogPost {
  return new BlogPost({
    id: e.id,
    slug: e.slug,
    title: e.title,
    excerpt: e.excerpt ?? undefined,
    content: e.content,
    category: e.category,
    author: e.author,
    coverImage: e.coverImage ?? undefined,
    coverPosition: e.coverPosition ?? undefined,
    readingTime: Number(e.readingTime) || undefined,
    status: e.status,
    publishedAt: e.publishedAt ?? null,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}

export class TypeOrmBlogPostRepository implements BlogPostRepository {
  private get repo() {
    return AppDataSource.getRepository(BlogPostEntity);
  }

  public async findPublished(category?: string): Promise<BlogPost[]> {
    const cat = category && category.toLowerCase() !== 'all' ? category : undefined;
    const rows = await this.repo.find({
      where: cat ? { status: 'published', category: cat } : { status: 'published' },
      order: { publishedAt: 'DESC', id: 'DESC' },
    });
    return rows.map(toDomain);
  }

  public async findAll(): Promise<BlogPost[]> {
    const rows = await this.repo.find({ order: { updatedAt: 'DESC', id: 'DESC' } });
    return rows.map(toDomain);
  }

  public async findBySlug(slug: string): Promise<BlogPost | null> {
    const row = await this.repo.findOne({ where: { slug } });
    return row ? toDomain(row) : null;
  }

  public async findById(id: number): Promise<BlogPost | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  public async save(post: BlogPost): Promise<BlogPost> {
    // El dominio calcula slug/excerpt/tiempo/timestamps; aquí solo se persisten.
    const entity = this.repo.create({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      author: post.author,
      coverImage: post.coverImage || null,
      coverPosition: post.coverPosition,
      readingTime: post.readingTime,
      status: post.status,
      publishedAt: post.publishedAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    });
    const saved = await this.repo.save(entity);
    return toDomain(saved);
  }

  public async delete(id: number): Promise<boolean> {
    const result = await this.repo.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
