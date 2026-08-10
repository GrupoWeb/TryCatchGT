import { AuditLogRepository, AuditLogEntry } from '../../../application/ports/output/AuditLogRepository.js';
import { AppDataSource } from './data-source.js';
import { AuditLogEntity } from './entities/AuditLogEntity.js';

function toEntry(e: AuditLogEntity): AuditLogEntry {
  return {
    id: e.id,
    action: e.action,
    actorId: e.actorId ?? null,
    actor: e.actor ?? null,
    ip: e.ip ?? null,
    method: e.method ?? null,
    path: e.path ?? null,
    status: e.status ?? null,
    detail: e.detail ?? null,
    createdAt: e.createdAt,
  };
}

export class TypeOrmAuditLogRepository implements AuditLogRepository {
  private get repo() {
    return AppDataSource.getRepository(AuditLogEntity);
  }

  public async record(entry: AuditLogEntry): Promise<void> {
    await this.repo.insert({
      action: entry.action,
      actorId: entry.actorId ?? null,
      actor: entry.actor ?? null,
      ip: entry.ip ?? null,
      method: entry.method ?? null,
      path: entry.path ?? null,
      status: entry.status ?? null,
      detail: entry.detail ?? null,
    });
  }

  public async list(limit: number): Promise<AuditLogEntry[]> {
    const safeLimit = Math.min(Math.max(1, Math.floor(limit) || 50), 500);
    const rows = await this.repo.find({ order: { id: 'DESC' }, take: safeLimit });
    return rows.map(toEntry);
  }
}
