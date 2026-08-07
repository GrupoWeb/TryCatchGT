import { Response } from 'express';
import { AuditLogRepository } from '../../../application/ports/output/AuditLogRepository.js';
import { UserRepository } from '../../../application/ports/output/UserRepository.js';
import { AuthedRequest } from '../middleware/requireAuth.js';

export class AuditController {
  constructor(
    private readonly audit: AuditLogRepository,
    private readonly users: UserRepository,
  ) {}

  public list = async (req: AuthedRequest, res: Response): Promise<void> => {
    const limit = Number(req.query.limit) || 100;
    const entries = await this.audit.list(limit);

    // Resuelve el actor a un nombre legible (displayName/fullName/username) en vez de solo el id.
    const users = await this.users.findAll();
    const labels = new Map<number, string>();
    for (const u of users) if (u.id !== undefined) labels.set(u.id, u.label);

    const data = entries.map((e) => ({
      ...e,
      actorLabel: e.actor || (e.actorId != null ? labels.get(e.actorId) || `#${e.actorId}` : null),
    }));
    res.status(200).json({ success: true, data });
  };
}
