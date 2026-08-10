import { Request, Response } from 'express';
import { GetBlogPostsUseCase } from '../../../application/ports/input/GetBlogPostsUseCase.js';
import { GetBlogPostBySlugUseCase } from '../../../application/ports/input/GetBlogPostBySlugUseCase.js';
import { BlogPost } from '../../../domain/entities/BlogPost.js';

function toListItem(post: BlogPost) {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    author: post.author,
    coverImage: post.coverImage,
    coverPosition: post.coverPosition,
    readingTime: post.readingTime,
    publishedAt: post.publishedAt,
  };
}

export class BlogController {
  constructor(
    private readonly getPosts: GetBlogPostsUseCase,
    private readonly getPostBySlug: GetBlogPostBySlugUseCase,
  ) {}

  public list = async (req: Request, res: Response): Promise<void> => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const posts = await this.getPosts.execute({ onlyPublished: true, category });
      res.status(200).json({ success: true, data: posts.map(toListItem) });
    } catch (error) {
      console.error('❌ Error listando artículos:', (error as Error).message);
      res.status(500).json({ success: false, error: 'No se pudieron obtener los artículos.' });
    }
  };

  public detail = async (req: Request, res: Response): Promise<void> => {
    try {
      const post = await this.getPostBySlug.execute(req.params.slug);
      if (!post || post.status !== 'published') {
        res.status(404).json({ success: false, error: 'Artículo no encontrado.' });
        return;
      }
      res.status(200).json({
        success: true,
        data: {
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          category: post.category,
          author: post.author,
          coverImage: post.coverImage,
          coverPosition: post.coverPosition,
          readingTime: post.readingTime,
          publishedAt: post.publishedAt,
        },
      });
    } catch (error) {
      console.error('❌ Error obteniendo artículo:', (error as Error).message);
      res.status(500).json({ success: false, error: 'No se pudo obtener el artículo.' });
    }
  };
}
