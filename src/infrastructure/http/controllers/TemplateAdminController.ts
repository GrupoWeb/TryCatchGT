import { Response } from 'express';
import { AuthedRequest } from '../middleware/requireAuth.js';
import { SaveEmailTemplate } from '../../../application/use-cases/SaveEmailTemplate.js';
import { GetEmailTemplates } from '../../../application/use-cases/GetEmailTemplates.js';
import { DeleteEmailTemplate } from '../../../application/use-cases/DeleteEmailTemplate.js';
import { EmailTemplateRepository } from '../../../application/ports/output/EmailTemplateRepository.js';
import {
  EmailTemplate,
  TEMPLATE_SEGMENTS,
  TemplateSegment,
} from '../../../domain/entities/EmailTemplate.js';
import { DomainError } from '../../../domain/exceptions/DomainError.js';

function toView(t: EmailTemplate) {
  return {
    id: t.id,
    name: t.name,
    subject: t.subject,
    bodyHtml: t.bodyHtml,
    segment: t.segment,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export class TemplateAdminController {
  constructor(
    private readonly templateRepo: EmailTemplateRepository,
    private readonly getTemplates: GetEmailTemplates,
    private readonly saveTemplate: SaveEmailTemplate,
    private readonly deleteTemplate: DeleteEmailTemplate,
  ) {}

  public list = async (req: AuthedRequest, res: Response): Promise<void> => {
    const segment =
      typeof req.query.segment === 'string' && TEMPLATE_SEGMENTS.includes(req.query.segment as TemplateSegment)
        ? (req.query.segment as TemplateSegment)
        : undefined;
    const templates = await this.getTemplates.execute(segment ? { segment } : undefined);
    res.status(200).json({ success: true, data: templates.map(toView) });
  };

  public getById = async (req: AuthedRequest, res: Response): Promise<void> => {
    const template = await this.templateRepo.findById(Number(req.params.id));
    if (!template) {
      res.status(404).json({ success: false, error: 'Plantilla no encontrada.' });
      return;
    }
    res.status(200).json({ success: true, data: toView(template) });
  };

  public create = async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const b = req.body ?? {};
      const template = await this.saveTemplate.execute({
        name: b.name,
        subject: b.subject,
        bodyHtml: b.bodyHtml,
        segment: b.segment,
        createdBy: req.userId ?? null,
      });
      res.status(201).json({ success: true, data: toView(template) });
    } catch (err) {
      if (err instanceof DomainError) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      throw err;
    }
  };

  public update = async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const b = req.body ?? {};
      const template = await this.saveTemplate.execute({
        id: Number(req.params.id),
        name: b.name,
        subject: b.subject,
        bodyHtml: b.bodyHtml,
        segment: b.segment,
      });
      res.status(200).json({ success: true, data: toView(template) });
    } catch (err) {
      if (err instanceof DomainError) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      throw err;
    }
  };

  public remove = async (req: AuthedRequest, res: Response): Promise<void> => {
    const ok = await this.deleteTemplate.execute(Number(req.params.id));
    if (!ok) {
      res.status(404).json({ success: false, error: 'Plantilla no encontrada.' });
      return;
    }
    res.status(200).json({ success: true });
  };
}
