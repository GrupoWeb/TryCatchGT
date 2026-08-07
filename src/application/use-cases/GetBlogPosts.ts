import { GetBlogPostsUseCase, GetBlogPostsQuery } from '../ports/input/GetBlogPostsUseCase.js';
import { BlogPostRepository } from '../ports/output/BlogPostRepository.js';
import { BlogPost } from '../../domain/entities/BlogPost.js';

export class GetBlogPosts implements GetBlogPostsUseCase {
  constructor(private readonly blogRepo: BlogPostRepository) {}

  public async execute(query: GetBlogPostsQuery): Promise<BlogPost[]> {
    if (query.onlyPublished) {
      return this.blogRepo.findPublished(query.category);
    }
    return this.blogRepo.findAll();
  }
}
