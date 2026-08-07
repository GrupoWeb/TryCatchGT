import { Response } from 'express';
import { AuditLogRepository } from '../../../application/ports/output/AuditLogRepository.js';
import { AuthedRequest } from '../middleware/requireAuth.js';

export class AuditController {
  constructor(private readonly audit: AuditLogRepository) {}

  public list = async (req: AuthedRequest, res: Response): Promise<void> => {
    const limit = Number(req.query.limit) || 100;
    const entries = await this.audit.list(limit);
    res.status(200).json({ success: true, data: entries });
  };
}
