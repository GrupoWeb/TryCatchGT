import { BlogPost } from '../../../domain/entities/BlogPost.js';

export interface BlogPostRepository {
  findPublished(category?: string): Promise<BlogPost[]>;
  findAll(): Promise<BlogPost[]>;
  findBySlug(slug: string): Promise<BlogPost | null>;
  findById(id: number): Promise<BlogPost | null>;
  save(post: BlogPost): Promise<BlogPost>;
  delete(id: number): Promise<boolean>;
}
