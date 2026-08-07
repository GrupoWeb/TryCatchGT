import { Request, Response } from 'express';
import { PlanRepository } from '../../../application/ports/output/PlanRepository.js';
import { Plan } from '../../../domain/entities/Plan.js';
import { slugify } from '../../../domain/entities/BlogPost.js';

function toView(p: Plan) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    priceMonthly: p.priceMonthly,
    priceMonthlyGtq: p.priceMonthlyGtq,
    currency: p.currency,
    features: p.features,
    services: p.services,
    accentColor: p.accentColor,
    ctaLabel: p.ctaLabel,
    isPopular: p.isPopular,
  };
}

function parseList(input: unknown): string[] {
  if (Array.isArray(input)) return input.map((t) => String(t).trim()).filter(Boolean);
  if (typeof input === 'string') return input.split('\n').map((t) => t.trim()).filter(Boolean);
  return [];
}

export class PlanAdminController {
  constructor(private readonly repo: PlanRepository) {}

  public list = async (_req: Request, res: Response): Promise<void> => {
    const plans = await this.repo.findAll();
    res.status(200).json({ success: true, data: plans.map(toView) });
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const p = await this.repo.findById(Number(req.params.id));
    if (!p) { res.status(404).json({ success: false, error: 'Plan no encontrado.' }); return; }
    res.status(200).json({ success: true, data: toView(p) });
  };

  public create = (req: Request, res: Response): Promise<void> => this.upsert(req, res, undefined);
  public update = (req: Request, res: Response): Promise<void> => this.upsert(req, res, Number(req.params.id));

  public remove = async (req: Request, res: Response): Promise<void> => {
    const ok = await this.repo.delete(Number(req.params.id));
    if (!ok) { res.status(404).json({ success: false, error: 'Plan no encontrado.' }); return; }
    res.status(200).json({ success: true });
  };

  private async upsert(req: Request, res: Response, id?: number): Promise<void> {
    try {
      const b = req.body ?? {};
      if (!b.name || String(b.name).trim().length < 2) {
        res.status(400).json({ success: false, error: 'El nombre del plan es obligatorio.' });
        return;
      }
      const plan = new Plan({
        id,
        slug: (b.slug && String(b.slug).trim()) || slugify(String(b.name)),
        name: String(b.name).trim(),
        tagline: String(b.tagline ?? '').trim(),
        priceMonthly: Number(b.priceMonthly) || 0,
        priceMonthlyGtq: Number(b.priceMonthlyGtq) || 0,
        currency: String(b.currency ?? 'USD').trim(),
        features: parseList(b.features),
        services: parseList(b.services),
        accentColor: String(b.accentColor ?? '#8B5CF6').trim(),
        ctaLabel: String(b.ctaLabel ?? 'Elegir plan').trim(),
        isPopular: Boolean(b.isPopular),
      });
      const saved = await this.repo.save(plan);
      res.status(id ? 200 : 201).json({ success: true, data: toView(saved) });
    } catch (error) {
      res.status(500).json({ success: false, error: 'No se pudo guardar el plan.', detail: (error as Error).message });
    }
  }
}
