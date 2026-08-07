import { BlogPost } from '../../../domain/entities/BlogPost.js';

export interface GetBlogPostsQuery {
  onlyPublished: boolean;
  category?: string;
}

export interface GetBlogPostsUseCase {
  execute(query: GetBlogPostsQuery): Promise<BlogPost[]>;
}
