import { DeleteBlogPostUseCase } from '../ports/input/DeleteBlogPostUseCase.js';
import { BlogPostRepository } from '../ports/output/BlogPostRepository.js';

export class DeleteBlogPost implements DeleteBlogPostUseCase {
  constructor(private readonly blogRepo: BlogPostRepository) {}

  public async execute(id: number): Promise<boolean> {
    return this.blogRepo.delete(id);
  }
}
