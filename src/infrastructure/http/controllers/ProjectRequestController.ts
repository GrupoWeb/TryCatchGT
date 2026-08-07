import { Request, Response } from 'express';
import { CreateProjectRequestUseCase } from '../../../application/ports/input/CreateProjectRequestUseCase.js';
import { DomainError } from '../../../domain/exceptions/DomainError.js';

export class ProjectRequestController {
  constructor(private readonly createProjectRequest: CreateProjectRequestUseCase) {}

  public create = async (req: Request, res: Response): Promise<void> => {
    try {
      const { clientName, clientEmail, companyName, projectType, budgetRange, description } =
        req.body ?? {};

      const projectRequest = await this.createProjectRequest.execute({
        clientName,
        clientEmail,
        companyName,
        projectType,
        budgetRange,
        description,
      });

      res.status(201).json({
        success: true,
        message: '¡Gracias! Hemos recibido tu solicitud y te contactaremos pronto.',
        data: {
          id: projectRequest.id,
          clientName: projectRequest.clientName,
          clientEmail: projectRequest.clientEmail.getValue(),
          projectType: projectRequest.projectType,
          status: projectRequest.status,
          createdAt: projectRequest.createdAt,
        },
      });
    } catch (error) {
      if (error instanceof DomainError) {
        res.status(400).json({ success: false, error: error.message });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Ocurrió un error al procesar tu solicitud.',
        detail: (error as Error).message,
      });
    }
  };
}
