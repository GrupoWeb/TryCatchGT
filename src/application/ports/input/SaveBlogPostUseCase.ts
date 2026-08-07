import { BlogPost, BlogStatus } from '../../../domain/entities/BlogPost.js';

export interface SaveBlogPostDTO {
  id?: number;
  slug?: string;
  title: string;
  excerpt?: string;
  content: string;
  category: string;
  author: string;
  coverImage?: string;
  coverPosition?: string;
  status?: BlogStatus;
}

export interface SaveBlogPostUseCase {
  execute(dto: SaveBlogPostDTO): Promise<BlogPost>;
}
