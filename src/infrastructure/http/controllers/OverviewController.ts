import { Request, Response } from 'express';
import { BlogPostRepository } from '../../../application/ports/output/BlogPostRepository.js';
import { ProjectRequestRepository } from '../../../application/ports/output/ProjectRequestRepository.js';

export class OverviewController {
  constructor(
    private readonly blogRepo: BlogPostRepository,
    private readonly leadRepo: ProjectRequestRepository,
  ) {}

  public stats = async (_req: Request, res: Response): Promise<void> => {
    const [posts, leads] = await Promise.all([this.blogRepo.findAll(), this.leadRepo.findAll()]);
    res.status(200).json({
      success: true,
      data: {
        postsPublished: posts.filter((p) => p.status === 'published').length,
        postsDraft: posts.filter((p) => p.status === 'draft').length,
        leadsTotal: leads.length,
        leadsPending: leads.filter((l) => l.status === 'pending').length,
      },
    });
  };
}
