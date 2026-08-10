import { Request, Response } from 'express';
import { GetBlogPostsUseCase } from '../../../application/ports/input/GetBlogPostsUseCase.js';
import { SaveBlogPostUseCase } from '../../../application/ports/input/SaveBlogPostUseCase.js';
import { DeleteBlogPostUseCase } from '../../../application/ports/input/DeleteBlogPostUseCase.js';
import { BlogPostRepository } from '../../../application/ports/output/BlogPostRepository.js';
import { BlogPost } from '../../../domain/entities/BlogPost.js';
import { DomainError } from '../../../domain/exceptions/DomainError.js';

function toAdminView(post: BlogPost) {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    category: post.category,
    author: post.author,
    coverImage: post.coverImage,
    coverPosition: post.coverPosition,
    readingTime: post.readingTime,
    status: post.status,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
  };
}

export class AdminBlogController {
  constructor(
    private readonly getPosts: GetBlogPostsUseCase,
    private readonly savePost: SaveBlogPostUseCase,
    private readonly deletePost: DeleteBlogPostUseCase,
    private readonly blogRepo: BlogPostRepository,
  ) {}

  public list = async (_req: Request, res: Response): Promise<void> => {
    const posts = await this.getPosts.execute({ onlyPublished: false });
    res.status(200).json({ success: true, data: posts.map(toAdminView) });
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const post = await this.blogRepo.findById(Number(req.params.id));
    if (!post) {
      res.status(404).json({ success: false, error: 'Artículo no encontrado.' });
      return;
    }
    res.status(200).json({ success: true, data: toAdminView(post) });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    await this.upsert(req, res, undefined);
  };

  public update = async (req: Request, res: Response): Promise<void> => {
    await this.upsert(req, res, Number(req.params.id));
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const ok = await this.deletePost.execute(Number(req.params.id));
    if (!ok) {
      res.status(404).json({ success: false, error: 'Artículo no encontrado.' });
      return;
    }
    res.status(200).json({ success: true });
  };

  private async upsert(req: Request, res: Response, id?: number): Promise<void> {
    try {
      const b = req.body ?? {};
      const post = await this.savePost.execute({
        id,
        slug: b.slug,
        title: b.title,
        excerpt: b.excerpt,
        content: b.content,
        category: b.category,
        author: b.author,
        coverImage: b.coverImage,
        coverPosition: b.coverPosition,
        status: b.status,
      });
      res.status(id ? 200 : 201).json({ success: true, data: toAdminView(post) });
    } catch (error) {
      if (error instanceof DomainError) {
        res.status(400).json({ success: false, error: error.message });
        return;
      }
      console.error('❌ Error guardando artículo:', (error as Error).message);
      res.status(500).json({ success: false, error: 'No se pudo guardar el artículo.' });
    }
  }
}
