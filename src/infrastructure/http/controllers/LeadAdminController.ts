import { Request, Response } from 'express';
import { ProjectRequestRepository } from '../../../application/ports/output/ProjectRequestRepository.js';
import { ProjectRequest, ProjectRequestStatus } from '../../../domain/entities/ProjectRequest.js';

const VALID_STATUS: ProjectRequestStatus[] = ['pending', 'reviewed', 'contacted'];

function toView(lead: ProjectRequest) {
  return {
    id: lead.id,
    clientName: lead.clientName,
    clientEmail: lead.clientEmail.getValue(),
    companyName: lead.companyName,
    projectType: lead.projectType,
    budgetRange: lead.budgetRange,
    description: lead.description,
    status: lead.status,
    createdAt: lead.createdAt,
  };
}

export class LeadAdminController {
  constructor(private readonly leadRepo: ProjectRequestRepository) {}

  public list = async (_req: Request, res: Response): Promise<void> => {
    const leads = await this.leadRepo.findAll();
    res.status(200).json({ success: true, data: leads.map(toView) });
  };

  public updateStatus = async (req: Request, res: Response): Promise<void> => {
    const status = req.body?.status as ProjectRequestStatus;
    if (!VALID_STATUS.includes(status)) {
      res.status(400).json({ success: false, error: 'Estado inválido.' });
      return;
    }
    const ok = await this.leadRepo.updateStatus(Number(req.params.id), status);
    if (!ok) {
      res.status(404).json({ success: false, error: 'Solicitud no encontrada.' });
      return;
    }
    res.status(200).json({ success: true });
  };
}
