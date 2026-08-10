import { Request, Response } from 'express';
import { GetPlansUseCase } from '../../../application/ports/input/GetPlansUseCase.js';

export class PlanController {
  constructor(private readonly getPlans: GetPlansUseCase) {}

  public list = async (_req: Request, res: Response): Promise<void> => {
    try {
      const plans = await this.getPlans.execute();
      res.status(200).json({
        success: true,
        data: plans.map((plan) => ({
          id: plan.id,
          slug: plan.slug,
          name: plan.name,
          tagline: plan.tagline,
          priceMonthly: plan.priceMonthly,
          priceMonthlyGtq: plan.priceMonthlyGtq,
          currency: plan.currency,
          features: plan.features,
          services: plan.services,
          accentColor: plan.accentColor,
          ctaLabel: plan.ctaLabel,
          isPopular: plan.isPopular,
        })),
      });
    } catch (error) {
      console.error('❌ Error obteniendo planes:', (error as Error).message);
      res.status(500).json({
        success: false,
        error: 'No se pudieron obtener los planes.',
      });
    }
  };
}
