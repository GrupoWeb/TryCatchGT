import { Request, Response } from 'express';
import { PageViewRepository } from '../../../application/ports/output/PageViewRepository.js';

export class AnalyticsController {
  constructor(private readonly pageViews: PageViewRepository) {}

  public summary = async (req: Request, res: Response): Promise<void> => {
    const days = Number(req.query.days) || 30;
    const data = await this.pageViews.summary(days);
    res.status(200).json({ success: true, data });
  };
}