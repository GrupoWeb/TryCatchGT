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
        // Distribución por estado: alimenta la dona del dashboard.
        leadsByStatus: {
          pending: leads.filter((l) => l.status === 'pending').length,
          reviewed: leads.filter((l) => l.status === 'reviewed').length,
          contacted: leads.filter((l) => l.status === 'contacted').length,
        },
        // Serie de los últimos 6 meses (incluye el actual): alimenta el área del dashboard.
        leadsByMonth: buildMonthlySeries(leads.map((l) => l.createdAt), 6),
      },
    });
  };
}

/**
 * Agrupa fechas por mes en los últimos `months` meses (incluido el actual) y
 * devuelve una serie ordenada cronológicamente lista para graficar.
 */
function buildMonthlySeries(dates: Array<Date | undefined>, months: number): Array<{ month: string; count: number }> {
  const now = new Date();
  const buckets = new Map<string, number>();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    keys.push(key);
    buckets.set(key, 0);
  }
  for (const raw of dates) {
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return keys.map((month) => ({ month, count: buckets.get(month) ?? 0 }));
}
