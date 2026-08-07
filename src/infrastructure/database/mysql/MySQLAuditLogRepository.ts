import { AuditLogRepository, AuditLogEntry } from '../../../application/ports/output/AuditLogRepository.js';
import { pool } from './connection.js';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

/**
 * Bitácora de auditoría respaldada por MySQL con degradación a memoria.
 * En modo memoria solo se conservan los últimos eventos del proceso en curso.
 */
export class MySQLAuditLogRepository implements AuditLogRepository {
  private readonly memoryStore: AuditLogEntry[] = [];
  private memorySequence = 1;
  private static readonly MEMORY_CAP = 500;

  public async record(entry: AuditLogEntry): Promise<void> {
    try {
      await pool.execute<ResultSetHeader>(
        `INSERT INTO audit_logs (action, actor_id, actor, ip, method, path, status, detail)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.action,
          entry.actorId ?? null,
          entry.actor ?? null,
          entry.ip ?? null,
          entry.method ?? null,
          entry.path ?? null,
          entry.status ?? null,
          entry.detail ?? null,
        ],
      );
    } catch {
      this.memoryStore.unshift({ ...entry, id: this.memorySequence++, createdAt: new Date() });
      if (this.memoryStore.length > MySQLAuditLogRepository.MEMORY_CAP) this.memoryStore.length = MySQLAuditLogRepository.MEMORY_CAP;
    }
  }

  public async list(limit: number): Promise<AuditLogEntry[]> {
    const safeLimit = Math.min(Math.max(1, Math.floor(limit) || 50), 500);
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?',
        [safeLimit],
      );
      return rows.map((r) => this.mapRow(r));
    } catch {
      return this.memoryStore.slice(0, safeLimit);
    }
  }

  private mapRow(row: RowDataPacket): AuditLogEntry {
    return {
      id: row.id,
      action: row.action,
      actorId: row.actor_id ?? null,
      actor: row.actor ?? null,
      ip: row.ip ?? null,
      method: row.method ?? null,
      path: row.path ?? null,
      status: row.status ?? null,
      detail: row.detail ?? null,
      createdAt: row.created_at,
    };
  }
}
