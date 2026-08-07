export interface DeleteBlogPostUseCase {
  execute(id: number): Promise<boolean>;
}
