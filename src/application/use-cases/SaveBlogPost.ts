import { SaveBlogPostUseCase, SaveBlogPostDTO } from '../ports/input/SaveBlogPostUseCase.js';
import { BlogPostRepository } from '../ports/output/BlogPostRepository.js';
import { BlogPost, slugify } from '../../domain/entities/BlogPost.js';

export class SaveBlogPost implements SaveBlogPostUseCase {
  constructor(private readonly blogRepo: BlogPostRepository) {}

  public async execute(dto: SaveBlogPostDTO): Promise<BlogPost> {
    const existing = dto.id ? await this.blogRepo.findById(dto.id) : null;
    const baseSlug = dto.slug?.trim() ? slugify(dto.slug) : slugify(dto.title);
    const slug = await this.ensureUniqueSlug(baseSlug, dto.id);

    // Al publicar por primera vez se fija la fecha de publicación.
    const nowPublished = dto.status === 'published';
    const publishedAt = nowPublished
      ? existing?.publishedAt ?? new Date()
      : null;

    const post = new BlogPost({
      id: existing?.id ?? dto.id,
      slug,
      title: dto.title,
      excerpt: dto.excerpt,
      content: dto.content,
      category: dto.category,
      author: dto.author,
      coverImage: dto.coverImage,
      coverPosition: dto.coverPosition,
      status: dto.status,
      publishedAt,
      createdAt: existing?.createdAt,
      updatedAt: new Date(),
    });

    return this.blogRepo.save(post);
  }

  /** Garantiza un slug único añadiendo un sufijo numérico si ya existe. */
  private async ensureUniqueSlug(base: string, currentId?: number): Promise<string> {
    let candidate = base || 'articulo';
    let suffix = 2;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const match = await this.blogRepo.findBySlug(candidate);
      if (!match || match.id === currentId) return candidate;
      candidate = `${base}-${suffix++}`;
    }
  }
}
