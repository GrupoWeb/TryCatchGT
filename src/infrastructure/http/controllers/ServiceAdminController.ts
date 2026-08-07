import { Request, Response } from 'express';
import { ServiceRepository } from '../../../application/ports/output/ServiceRepository.js';
import { Service } from '../../../domain/entities/Service.js';
import { slugify } from '../../../domain/entities/BlogPost.js';

function toView(s: Service) {
  return {
    id: s.id,
    slug: s.slug,
    title: s.title,
    description: s.description,
    icon: s.icon,
    accentColor: s.accentColor,
    tags: s.tags,
    isFeatured: s.isFeatured,
  };
}

function parseTags(input: unknown): string[] {
  if (Array.isArray(input)) return input.map((t) => String(t).trim()).filter(Boolean);
  if (typeof input === 'string') return input.split(',').map((t) => t.trim()).filter(Boolean);
  return [];
}

export class ServiceAdminController {
  constructor(private readonly repo: ServiceRepository) {}

  public list = async (_req: Request, res: Response): Promise<void> => {
    const services = await this.repo.findAll();
    res.status(200).json({ success: true, data: services.map(toView) });
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const s = await this.repo.findById(Number(req.params.id));
    if (!s) { res.status(404).json({ success: false, error: 'Servicio no encontrado.' }); return; }
    res.status(200).json({ success: true, data: toView(s) });
  };

  public create = (req: Request, res: Response): Promise<void> => this.upsert(req, res, undefined);
  public update = (req: Request, res: Response): Promise<void> => this.upsert(req, res, Number(req.params.id));

  public remove = async (req: Request, res: Response): Promise<void> => {
    const ok = await this.repo.delete(Number(req.params.id));
    if (!ok) { res.status(404).json({ success: false, error: 'Servicio no encontrado.' }); return; }
    res.status(200).json({ success: true });
  };

  private async upsert(req: Request, res: Response, id?: number): Promise<void> {
    try {
      const b = req.body ?? {};
      if (!b.title || String(b.title).trim().length < 2) {
        res.status(400).json({ success: false, error: 'El título es obligatorio.' });
        return;
      }
      const service = new Service({
        id,
        slug: (b.slug && String(b.slug).trim()) || slugify(String(b.title)),
        title: String(b.title).trim(),
        description: String(b.description ?? '').trim(),
        icon: String(b.icon ?? '⚙️').trim(),
        accentColor: String(b.accentColor ?? '#8B5CF6').trim(),
        tags: parseTags(b.tags),
        isFeatured: Boolean(b.isFeatured),
      });
      const saved = await this.repo.save(service);
      res.status(id ? 200 : 201).json({ success: true, data: toView(saved) });
    } catch (error) {
      res.status(500).json({ success: false, error: 'No se pudo guardar el servicio.', detail: (error as Error).message });
    }
  }
}
