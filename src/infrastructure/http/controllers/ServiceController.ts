import { Request, Response } from 'express';
import { GetServicesUseCase } from '../../../application/ports/input/GetServicesUseCase.js';

export class ServiceController {
  constructor(private readonly getServices: GetServicesUseCase) {}

  public list = async (_req: Request, res: Response): Promise<void> => {
    try {
      const services = await this.getServices.execute();
      res.status(200).json({
        success: true,
        data: services.map((service) => ({
          id: service.id,
          slug: service.slug,
          title: service.title,
          description: service.description,
          icon: service.icon,
          accentColor: service.accentColor,
          tags: service.tags,
          isFeatured: service.isFeatured,
        })),
      });
    } catch (error) {
      console.error('❌ Error obteniendo servicios:', (error as Error).message);
      res.status(500).json({
        success: false,
        error: 'No se pudieron obtener los servicios.',
      });
    }
  };
}
