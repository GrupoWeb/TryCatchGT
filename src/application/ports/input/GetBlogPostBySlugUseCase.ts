import { BlogPost } from '../../../domain/entities/BlogPost.js';

export interface GetBlogPostBySlugUseCase {
  execute(slug: string): Promise<BlogPost | null>;
}
