import { GetBlogPostBySlugUseCase } from '../ports/input/GetBlogPostBySlugUseCase.js';
import { BlogPostRepository } from '../ports/output/BlogPostRepository.js';
import { BlogPost } from '../../domain/entities/BlogPost.js';

export class GetBlogPostBySlug implements GetBlogPostBySlugUseCase {
  constructor(private readonly blogRepo: BlogPostRepository) {}

  public async execute(slug: string): Promise<BlogPost | null> {
    return this.blogRepo.findBySlug(slug.trim().toLowerCase());
  }
}
